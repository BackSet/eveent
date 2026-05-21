package com.event.backend.service;

import com.event.backend.dto.convocatoria.ConvocatoriaRequest;
import com.event.backend.dto.convocatoria.ConvocatoriaResponse;
import com.event.backend.model.Asistencia;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.Deporte;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.Usuario;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.repository.AsistenciaRepository;
import com.event.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaService {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final DeporteRepository deporteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AsistenciaRepository asistenciaRepository;

    @Transactional
    public List<ConvocatoriaResponse> findAll() {
        cerrarVencidas();
        return convocatoriaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<ConvocatoriaResponse> findByEstado(EstadoConvocatoria estado) {
        cerrarVencidas();
        return convocatoriaRepository.findByEstado(estado).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<ConvocatoriaResponse> findByCreador(Long usuarioId) {
        cerrarVencidas();
        return convocatoriaRepository.findByCreadoPorId(usuarioId).stream()
                .map(this::toResponse)
                .toList();
    }

    private void cerrarVencidas() {
        List<Convocatoria> vencidas = convocatoriaRepository.findByEstadoAndFechaHoraBefore(
                EstadoConvocatoria.ABIERTA, LocalDateTime.now());
        for (Convocatoria c : vencidas) {
            c.setEstado(EstadoConvocatoria.CERRADA);
            convocatoriaRepository.save(c);
        }
        if (!vencidas.isEmpty()) {
            log.info("Cerradas {} convocatorias vencidas al listar", vencidas.size());
        }
    }

    @Transactional(readOnly = true)
    public ConvocatoriaResponse findById(Long id) {
        return convocatoriaRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada con id: " + id));
    }

    public ConvocatoriaResponse create(ConvocatoriaRequest request) {
        Usuario creador = getCurrentUser();
        Deporte deporte = deporteRepository.findById(request.getDeporteId())
                .orElseThrow(() -> new RuntimeException("Deporte no encontrado con id: " + request.getDeporteId()));

        Convocatoria convocatoria = Convocatoria.builder()
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .deporte(deporte)
                .fechaHora(request.getFechaHora())
                .lugar(request.getLugar())
                .creadoPor(creador)
                .estado(request.getEstado() != null ? request.getEstado() : EstadoConvocatoria.BORRADOR)
                .cupoMaximo(request.getCupoMaximo() != null ? request.getCupoMaximo() : 0)
                .categoria(request.getCategoria())
                .fechaLimiteInscripcion(request.getFechaLimiteInscripcion())
                .manejoExcedente(request.getManejoExcedente() != null ? request.getManejoExcedente() : "LISTA_ESPERA")
                .build();
        convocatoria = convocatoriaRepository.save(convocatoria);
        return toResponse(convocatoria);
    }

    public ConvocatoriaResponse update(Long id, ConvocatoriaRequest request) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada con id: " + id));

        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getEmail().equals("admin@event.com");
        if (!convocatoria.getCreadoPor().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para editar esta convocatoria");
        }

        if (request.getTitulo() != null) convocatoria.setTitulo(request.getTitulo());
        if (request.getDescripcion() != null) convocatoria.setDescripcion(request.getDescripcion());
        if (request.getFechaHora() != null) convocatoria.setFechaHora(request.getFechaHora());
        if (request.getLugar() != null) convocatoria.setLugar(request.getLugar());
        if (request.getEstado() != null) convocatoria.setEstado(request.getEstado());
        if (request.getCupoMaximo() != null) convocatoria.setCupoMaximo(request.getCupoMaximo());
        if (request.getCategoria() != null) convocatoria.setCategoria(request.getCategoria());
        if (request.getFechaLimiteInscripcion() != null) convocatoria.setFechaLimiteInscripcion(request.getFechaLimiteInscripcion());
        if (request.getManejoExcedente() != null) convocatoria.setManejoExcedente(request.getManejoExcedente());

        if (request.getDeporteId() != null && !request.getDeporteId().equals(convocatoria.getDeporte().getId())) {
            Deporte deporte = deporteRepository.findById(request.getDeporteId())
                    .orElseThrow(() -> new RuntimeException("Deporte no encontrado con id: " + request.getDeporteId()));
            convocatoria.setDeporte(deporte);
        }

        convocatoria = convocatoriaRepository.save(convocatoria);
        return toResponse(convocatoria);
    }

    public void delete(Long id) {
        Convocatoria convocatoria = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada con id: " + id));

        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getEmail().equals("admin@event.com");
        if (!convocatoria.getCreadoPor().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para eliminar esta convocatoria");
        }

        List<Asistencia> asistencias = asistenciaRepository.findByConvocatoriaId(id);
        if (!asistencias.isEmpty()) {
            asistenciaRepository.deleteAll(asistencias);
        }
        convocatoriaRepository.deleteById(id);
    }

    private Usuario getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return usuarioRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        }
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private ConvocatoriaResponse toResponse(Convocatoria convocatoria) {
        return ConvocatoriaResponse.builder()
                .id(convocatoria.getId())
                .titulo(convocatoria.getTitulo())
                .descripcion(convocatoria.getDescripcion())
                .deporteId(convocatoria.getDeporte().getId())
                .deporteNombre(convocatoria.getDeporte().getNombre())
                .fechaHora(convocatoria.getFechaHora())
                .lugar(convocatoria.getLugar())
                .creadoPorId(convocatoria.getCreadoPor().getId())
                .creadoPorNombre(convocatoria.getCreadoPor().getNombre())
                .estado(convocatoria.getEstado())
                .fechaCreacion(convocatoria.getFechaCreacion())
                .cupoMaximo(convocatoria.getCupoMaximo())
                .categoria(convocatoria.getCategoria())
                .fechaLimiteInscripcion(convocatoria.getFechaLimiteInscripcion())
                .manejoExcedente(convocatoria.getManejoExcedente())
                .recurrenciaId(convocatoria.getRecurrencia() != null ? convocatoria.getRecurrencia().getId() : null)
                .build();
    }
}