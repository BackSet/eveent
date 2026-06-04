package com.event.backend.service;

import com.event.backend.dto.usuario.AutoAceptacionRequest;
import com.event.backend.dto.usuario.AutoAceptacionResponse;
import com.event.backend.exception.BusinessException;
import com.event.backend.model.*;
import com.event.backend.repository.AsistenciaRepository;
import com.event.backend.repository.UsuarioPosicionRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.util.ConvocatoriaScheduleHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AutoAceptacionService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final UsuarioRepository usuarioRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final UsuarioPosicionRepository usuarioPosicionRepository;

    @Transactional(readOnly = true)
    public AutoAceptacionResponse getConfig(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new com.event.backend.exception.NotFoundException("Usuario no encontrado"));
        int pendientes = countPendingApplicable(usuario);
        return toResponse(usuario, pendientes, 0);
    }

    public AutoAceptacionResponse updateConfig(Long usuarioId, AutoAceptacionRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new com.event.backend.exception.NotFoundException("Usuario no encontrado"));

        AutoAceptacionModo modo = parseModo(request.getModo());
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime referencia = resolveReferencia(modo, request.getReferencia(), now);

        usuario.setAutoAceptacionModo(modo);
        usuario.setAutoAceptacionReferencia(referencia);
        usuario.setAutoAceptacionActualizadoEn(now);
        usuario = usuarioRepository.save(usuario);

        int aplicados = 0;
        if (request.isAplicarPendientes() && modo != AutoAceptacionModo.OFF) {
            aplicados = applyToPendingInvitations(usuarioId);
        }

        int pendientes = countPendingApplicable(usuario);
        return toResponse(usuario, pendientes, aplicados);
    }

    @Transactional(readOnly = true)
    public boolean matches(Usuario usuario, LocalDateTime eventTime, LocalDateTime now) {
        if (usuario == null || eventTime == null) {
            return false;
        }
        if (isSuspended(usuario, now)) {
            return false;
        }
        AutoAceptacionModo modo = usuario.getAutoAceptacionModo() != null
                ? usuario.getAutoAceptacionModo()
                : AutoAceptacionModo.OFF;
        if (modo == AutoAceptacionModo.OFF) {
            return false;
        }

        LocalDate eventDate = eventTime.toLocalDate();

        return switch (modo) {
            case HOY -> eventDate.equals(now.toLocalDate());
            case DIA -> {
                if (usuario.getAutoAceptacionReferencia() == null) {
                    yield false;
                }
                yield eventDate.equals(usuario.getAutoAceptacionReferencia().toLocalDate());
            }
            case DESDE_FECHA_HORA -> {
                if (usuario.getAutoAceptacionReferencia() == null) {
                    yield false;
                }
                yield !eventTime.isBefore(usuario.getAutoAceptacionReferencia());
            }
            default -> false;
        };
    }

    /**
     * Si la regla aplica, confirma la asistencia (ASISTIRE o LISTA_ESPERA) y posiciones del perfil.
     *
     * @return true si se aplicó auto-aceptación
     */
    public boolean enrichAsistenciaForAutoAccept(Asistencia asistencia, Usuario usuario) {
        if (asistencia == null || usuario == null || asistencia.getUsuario() == null) {
            return false;
        }
        if (asistencia.getEstado() == EstadoAsistencia.NO_ASISTIRE) {
            return false;
        }

        Convocatoria conv = asistencia.getConvocatoria();
        if (conv == null || conv.getFechaHora() == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        if (!matches(usuario, conv.getFechaHora(), now)) {
            return false;
        }

        try {
            ConvocatoriaScheduleHelper.assertConvocatoriaActiveForSideEffects(conv, now);
        } catch (Exception e) {
            return false;
        }

        applyPositionsFromProfile(asistencia, usuario, conv);
        EstadoAsistencia finalEstado = evaluateEstadoWithCupo(conv, EstadoAsistencia.ASISTIRE);
        asistencia.setEstado(finalEstado);
        asistencia.setFechaRespuesta(now);
        asistencia.setAutoAceptada(true);
        return true;
    }

    public int applyToPendingInvitations(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new com.event.backend.exception.NotFoundException("Usuario no encontrado"));
        if (usuario.getAutoAceptacionModo() == null || usuario.getAutoAceptacionModo() == AutoAceptacionModo.OFF) {
            return 0;
        }

        List<Asistencia> pendientes = asistenciaRepository.findByUsuarioIdAndEstado(usuarioId, EstadoAsistencia.PENDIENTE);
        int count = 0;
        for (Asistencia a : pendientes) {
            if (enrichAsistenciaForAutoAccept(a, usuario)) {
                asistenciaRepository.save(a);
                count++;
            }
        }
        return count;
    }

    public boolean shouldAutoAcceptOnSelfRegister(Usuario usuario, Convocatoria conv, EstadoAsistencia requestedEstado) {
        if (requestedEstado == EstadoAsistencia.NO_ASISTIRE) {
            return false;
        }
        return matches(usuario, conv.getFechaHora(), LocalDateTime.now());
    }

    private int countPendingApplicable(Usuario usuario) {
        if (usuario.getAutoAceptacionModo() == null || usuario.getAutoAceptacionModo() == AutoAceptacionModo.OFF) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        List<Asistencia> pendientes = asistenciaRepository.findByUsuarioIdAndEstado(usuario.getId(), EstadoAsistencia.PENDIENTE);
        return (int) pendientes.stream()
                .filter(a -> a.getConvocatoria() != null && a.getConvocatoria().getFechaHora() != null)
                .filter(a -> matches(usuario, a.getConvocatoria().getFechaHora(), now))
                .count();
    }

    private void applyPositionsFromProfile(Asistencia asistencia, Usuario usuario, Convocatoria conv) {
        if (conv.getDeporte() == null) {
            return;
        }
        Long deporteId = conv.getDeporte().getId();
        List<UsuarioPosicion> positions = usuarioPosicionRepository.findByUsuarioId(usuario.getId()).stream()
                .filter(up -> up.getPosicion() != null
                        && up.getPosicion().getDeporte() != null
                        && up.getPosicion().getDeporte().getId().equals(deporteId))
                .sorted(Comparator.comparing(UsuarioPosicion::getPrioridad))
                .toList();

        if (positions.isEmpty()) {
            return;
        }

        List<PosicionesDeporte> selected = new ArrayList<>();
        for (UsuarioPosicion up : positions) {
            selected.add(up.getPosicion());
        }
        asistencia.setPosicionesPreferidas(selected);
        asistencia.setPosicionPreferida(positions.get(0).getPosicion());
    }

    private EstadoAsistencia evaluateEstadoWithCupo(Convocatoria conv, EstadoAsistencia requestedEstado) {
        if (requestedEstado == EstadoAsistencia.ASISTIRE) {
            if (conv.getCupoMaximo() != null && conv.getCupoMaximo() > 0) {
                long countAsistire = asistenciaRepository.countByConvocatoriaIdAndEstado(conv.getId(), EstadoAsistencia.ASISTIRE);
                if (countAsistire >= conv.getCupoMaximo()) {
                    if ("LISTA_ESPERA".equals(conv.getManejoExcedente())) {
                        return EstadoAsistencia.LISTA_ESPERA;
                    }
                }
            }
        }
        return requestedEstado;
    }

    private boolean isSuspended(Usuario usuario, LocalDateTime now) {
        return usuario.getFechaFinSuspension() != null && usuario.getFechaFinSuspension().isAfter(now);
    }

    private AutoAceptacionModo parseModo(String modo) {
        if (modo == null || modo.isBlank()) {
            return AutoAceptacionModo.OFF;
        }
        try {
            return AutoAceptacionModo.valueOf(modo.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Modo de auto-aceptacion no valido: " + modo);
        }
    }

    private LocalDateTime resolveReferencia(AutoAceptacionModo modo, LocalDateTime referencia, LocalDateTime now) {
        return switch (modo) {
            case OFF -> null;
            case HOY -> now.toLocalDate().atStartOfDay();
            case DIA -> {
                if (referencia == null) {
                    throw new BusinessException("Debes indicar el dia para la disponibilidad automatica.");
                }
                yield referencia.toLocalDate().atStartOfDay();
            }
            case DESDE_FECHA_HORA -> {
                if (referencia == null) {
                    throw new BusinessException("Debes indicar fecha y hora de inicio.");
                }
                if (referencia.isBefore(now.minusMinutes(1))) {
                    throw new BusinessException("La fecha y hora de inicio debe ser actual o futura.");
                }
                yield referencia;
            }
        };
    }

    private AutoAceptacionResponse toResponse(Usuario usuario, int pendientes, int aplicados) {
        AutoAceptacionModo modo = usuario.getAutoAceptacionModo() != null
                ? usuario.getAutoAceptacionModo()
                : AutoAceptacionModo.OFF;
        boolean activa = modo != AutoAceptacionModo.OFF;
        return AutoAceptacionResponse.builder()
                .modo(modo.name())
                .referencia(usuario.getAutoAceptacionReferencia())
                .activa(activa)
                .resumen(buildResumen(usuario, modo))
                .pendientesAplicables(pendientes)
                .pendientesAplicados(aplicados)
                .build();
    }

    @Transactional(readOnly = true)
    public String resumenFor(Usuario usuario) {
        AutoAceptacionModo modo = usuario.getAutoAceptacionModo() != null
                ? usuario.getAutoAceptacionModo()
                : AutoAceptacionModo.OFF;
        return buildResumen(usuario, modo);
    }

    private String buildResumen(Usuario usuario, AutoAceptacionModo modo) {
        return switch (modo) {
            case OFF -> "Desactivada";
            case HOY -> "Activa hoy — confirma convocatorias del dia";
            case DIA -> {
                if (usuario.getAutoAceptacionReferencia() == null) {
                    yield "Activa para un dia concreto";
                }
                yield "Activa el " + usuario.getAutoAceptacionReferencia().toLocalDate().format(DATE_FMT);
            }
            case DESDE_FECHA_HORA -> {
                if (usuario.getAutoAceptacionReferencia() == null) {
                    yield "Activa desde fecha y hora indicada";
                }
                yield "Activa desde " + usuario.getAutoAceptacionReferencia().format(DATETIME_FMT);
            }
        };
    }
}
