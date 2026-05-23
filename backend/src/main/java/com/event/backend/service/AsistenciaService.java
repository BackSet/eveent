package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaRequest;
import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.dto.asistencia.AsistenciaUpdateRequest;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.*;
import com.event.backend.repository.*;
import com.event.backend.security.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AsistenciaService {

    private final AsistenciaRepository asistenciaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PosicionesDeporteRepository posicionRepository;
    private final BandoConvocatoriaRepository bandoRepository;
    private final SecurityService securityService;
    private final AsistenciaMapper asistenciaMapper;
    private final UsuarioPosicionRepository usuarioPosicionRepository;

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByConvocatoriaId(Long convocatoriaId) {
        return asistenciaRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(asistenciaMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByUsuarioId(Long usuarioId) {
        return asistenciaRepository.findByUsuarioId(usuarioId).stream()
                .map(asistenciaMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AsistenciaResponse findById(Long id) {
        return asistenciaRepository.findById(id)
                .map(asistenciaMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Asistencia no encontrada con id: " + id));
    }

    @Transactional(readOnly = true)
    public AsistenciaResponse findByConvocatoriaAndUsuario(Long convocatoriaId) {
        Long usuarioId = securityService.getCurrentUserId();
        return asistenciaRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, usuarioId)
                .map(asistenciaMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("No tienes registro de asistencia para esta convocatoria"));
    }

    public AsistenciaResponse create(AsistenciaRequest request) {
        Usuario usuario = securityService.getCurrentUser();
        Convocatoria convocatoria = convocatoriaRepository.findById(request.getConvocatoriaId())
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + request.getConvocatoriaId()));

        // Validar si es una convocatoria abierta (categoria LIBRE), debe ser del deporte que practica el usuario
        Deporte deporteConvocatoria = convocatoria.getDeporte();
        if (deporteConvocatoria != null && "LIBRE".equalsIgnoreCase(convocatoria.getCategoria())) {
            List<UsuarioPosicion> posicionesUsuario = usuarioPosicionRepository.findByUsuarioId(usuario.getId());
            boolean practicaDeporte = posicionesUsuario.stream()
                    .anyMatch(up -> up.getPosicion() != null 
                            && up.getPosicion().getDeporte() != null 
                            && up.getPosicion().getDeporte().getId().equals(deporteConvocatoria.getId()));
            
            if (!practicaDeporte) {
                throw new com.event.backend.exception.ConflictException("Solo los jugadores que practican el deporte " 
                        + deporteConvocatoria.getNombre() + " pueden inscribirse a esta convocatoria abierta. "
                        + "Configura tus demarcaciones de " + deporteConvocatoria.getNombre() + " en tu perfil para continuar.");
            }
        }

        var existing = asistenciaRepository.findByConvocatoriaIdAndUsuarioId(request.getConvocatoriaId(), usuario.getId());
        if (existing.isPresent()) {
            Asistencia asistencia = existing.get();
            if (request.getEstado() != null) {
                asistencia.setEstado(EstadoAsistencia.valueOf(request.getEstado()));
            }
            asistencia.setFechaRespuesta(LocalDateTime.now());
            asistencia = asistenciaRepository.save(asistencia);
            return asistenciaMapper.toResponse(asistencia);
        }

        Asistencia.AsistenciaBuilder builder = Asistencia.builder()
                .convocatoria(convocatoria)
                .usuario(usuario)
                .estado(request.getEstado() != null ? EstadoAsistencia.valueOf(request.getEstado()) : EstadoAsistencia.PENDIENTE);

        if (request.getPosicionPreferidaId() != null) {
            PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionPreferidaId())
                    .orElseThrow(() -> new NotFoundException("Posicion no encontrada con id: " + request.getPosicionPreferidaId()));
            builder.posicionPreferida(posicion);
        }

        if (request.getBandoId() != null) {
            BandoConvocatoria bando = bandoRepository.findById(request.getBandoId())
                    .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + request.getBandoId()));
            builder.bando(bando);
        }

        Asistencia asistencia = builder.build();
        asistencia = asistenciaRepository.save(asistencia);
        return asistenciaMapper.toResponse(asistencia);
    }

    public AsistenciaResponse update(Long id, AsistenciaUpdateRequest request) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Asistencia no encontrada con id: " + id));

        Long currentUserId = securityService.getCurrentUserId();
        if (!asistencia.getUsuario().getId().equals(currentUserId) && !hasAdminPermission()) {
            throw new ForbiddenException("No tienes permiso para editar esta asistencia");
        }

        EstadoAsistencia oldEstado = asistencia.getEstado();
        EstadoAsistencia newEstado = request.getEstado();

        if (newEstado != null) {
            if (newEstado == EstadoAsistencia.ASISTIRE && oldEstado != EstadoAsistencia.ASISTIRE) {
                Convocatoria conv = asistencia.getConvocatoria();
                if (conv.getCupoMaximo() != null && conv.getCupoMaximo() > 0) {
                    long countAsistire = asistenciaRepository.countByConvocatoriaIdAndEstado(conv.getId(), EstadoAsistencia.ASISTIRE);
                    if (countAsistire >= conv.getCupoMaximo()) {
                        if ("LISTA_ESPERA".equals(conv.getManejoExcedente())) {
                            newEstado = EstadoAsistencia.LISTA_ESPERA;
                        }
                    }
                }
            }
            asistencia.setEstado(newEstado);
            asistencia.setFechaRespuesta(LocalDateTime.now());
        }

        if (request.getPosicionPreferidaId() != null) {
            PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionPreferidaId())
                    .orElseThrow(() -> new NotFoundException("Posicion no encontrada con id: " + request.getPosicionPreferidaId()));
            asistencia.setPosicionPreferida(posicion);
        }

        if (request.getBandoId() != null) {
            BandoConvocatoria bando = bandoRepository.findById(request.getBandoId())
                    .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + request.getBandoId()));
            asistencia.setBando(bando);
        }

        asistencia = asistenciaRepository.save(asistencia);

        if (oldEstado == EstadoAsistencia.ASISTIRE && newEstado != null && newEstado != EstadoAsistencia.ASISTIRE) {
            promoteFromWaitlist(asistencia.getConvocatoria().getId());
        }

        return asistenciaMapper.toResponse(asistencia);
    }

    public void delete(Long id) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Asistencia no encontrada con id: " + id));

        Long currentUserId = securityService.getCurrentUserId();
        if (!asistencia.getUsuario().getId().equals(currentUserId) && !hasAdminPermission()) {
            throw new ForbiddenException("No tienes permiso para eliminar esta asistencia");
        }

        EstadoAsistencia estado = asistencia.getEstado();
        Long convocatoriaId = asistencia.getConvocatoria().getId();

        asistenciaRepository.deleteById(id);

        if (estado == EstadoAsistencia.ASISTIRE) {
            promoteFromWaitlist(convocatoriaId);
        }
    }

    private boolean hasAdminPermission() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("gestionar_convocatorias")
                        || a.getAuthority().equals("ROLE_SUPERADMIN"));
    }

    private void promoteFromWaitlist(Long convocatoriaId) {
        List<Asistencia> waitlist = asistenciaRepository.findByConvocatoriaIdAndEstado(convocatoriaId, EstadoAsistencia.LISTA_ESPERA);
        if (!waitlist.isEmpty()) {
            Asistencia first = waitlist.get(0);
            first.setEstado(EstadoAsistencia.ASISTIRE);
            first.setFechaRespuesta(LocalDateTime.now());
            asistenciaRepository.save(first);
        }
    }

    public List<AsistenciaResponse> bulkInvite(Long convocatoriaId, List<Long> usuarioIds) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada"));

        List<Asistencia> existing = asistenciaRepository.findByConvocatoriaId(convocatoriaId);
        Set<Long> existingUserIds = existing.stream()
                .filter(a -> a.getUsuario() != null)
                .map(a -> a.getUsuario().getId())
                .collect(Collectors.toSet());

        List<Long> newIds = usuarioIds.stream().filter(uid -> !existingUserIds.contains(uid)).toList();
        if (newIds.isEmpty()) return List.of();

        List<Usuario> users = usuarioRepository.findAllById(newIds);

        List<Asistencia> newAsistencias = users.stream()
                .map(usuario -> Asistencia.builder()
                        .convocatoria(convocatoria)
                        .usuario(usuario)
                        .estado(EstadoAsistencia.PENDIENTE)
                        .build())
                .toList();

        asistenciaRepository.saveAll(newAsistencias);

        return asistenciaRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(asistenciaMapper::toResponse)
                .toList();
    }
}
