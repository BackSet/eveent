package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaRequest;
import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.dto.asistencia.AsistenciaUpdateRequest;
import com.event.backend.model.*;
import com.event.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AsistenciaService {

    private final AsistenciaRepository asistenciaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PosicionesDeporteRepository posicionRepository;
    private final EquiposConvocatoriaRepository equipoRepository;

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByConvocatoriaId(Long convocatoriaId) {
        return asistenciaRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AsistenciaResponse> findByUsuarioId(Long usuarioId) {
        return asistenciaRepository.findByUsuarioId(usuarioId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AsistenciaResponse findById(Long id) {
        return asistenciaRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Asistencia no encontrada con id: " + id));
    }

    @Transactional(readOnly = true)
    public AsistenciaResponse findByConvocatoriaAndUsuario(Long convocatoriaId) {
        Long usuarioId = getCurrentUserId();
        return asistenciaRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, usuarioId)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("No tienes registro de asistencia para esta convocatoria"));
    }

    public AsistenciaResponse create(AsistenciaRequest request) {
        Usuario usuario = getCurrentUser();
        Convocatoria convocatoria = convocatoriaRepository.findById(request.getConvocatoriaId())
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada con id: " + request.getConvocatoriaId()));

        if (asistenciaRepository.findByConvocatoriaIdAndUsuarioId(request.getConvocatoriaId(), usuario.getId()).isPresent()) {
            throw new RuntimeException("Ya tienes un registro de asistencia para esta convocatoria");
        }

        Asistencia.AsistenciaBuilder builder = Asistencia.builder()
                .convocatoria(convocatoria)
                .usuario(usuario)
                .estado(EstadoAsistencia.PENDIENTE);

        if (request.getPosicionId() != null) {
            PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionId())
                    .orElseThrow(() -> new RuntimeException("Posicion no encontrada con id: " + request.getPosicionId()));
            builder.posicion(posicion);
        }

        if (request.getEquipoId() != null) {
            EquiposConvocatoria equipo = equipoRepository.findById(request.getEquipoId())
                    .orElseThrow(() -> new RuntimeException("Equipo no encontrado con id: " + request.getEquipoId()));
            builder.equipo(equipo);
        }

        Asistencia asistencia = builder.build();
        asistencia = asistenciaRepository.save(asistencia);
        return toResponse(asistencia);
    }

    public AsistenciaResponse update(Long id, AsistenciaUpdateRequest request) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asistencia no encontrada con id: " + id));

        Long currentUserId = getCurrentUserId();
        boolean isAdmin = getCurrentUserEmail().equals("admin@event.com");
        if (!asistencia.getUsuario().getId().equals(currentUserId) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para editar esta asistencia");
        }

        if (request.getEstado() != null) asistencia.setEstado(request.getEstado());

        if (request.getPosicionId() != null) {
            PosicionesDeporte posicion = posicionRepository.findById(request.getPosicionId())
                    .orElseThrow(() -> new RuntimeException("Posicion no encontrada con id: " + request.getPosicionId()));
            asistencia.setPosicion(posicion);
        }

        if (request.getEquipoId() != null) {
            EquiposConvocatoria equipo = equipoRepository.findById(request.getEquipoId())
                    .orElseThrow(() -> new RuntimeException("Equipo no encontrado con id: " + request.getEquipoId()));
            asistencia.setEquipo(equipo);
        }

        asistencia = asistenciaRepository.save(asistencia);
        return toResponse(asistencia);
    }

    public void delete(Long id) {
        Asistencia asistencia = asistenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asistencia no encontrada con id: " + id));

        Long currentUserId = getCurrentUserId();
        boolean isAdmin = getCurrentUserEmail().equals("admin@event.com");
        if (!asistencia.getUsuario().getId().equals(currentUserId) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para eliminar esta asistencia");
        }

        asistenciaRepository.deleteById(id);
    }

    private Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private String getCurrentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private Usuario getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private AsistenciaResponse toResponse(Asistencia asistencia) {
        return AsistenciaResponse.builder()
                .id(asistencia.getId())
                .convocatoriaId(asistencia.getConvocatoria().getId())
                .convocatoriaTitulo(asistencia.getConvocatoria().getTitulo())
                .usuarioId(asistencia.getUsuario() != null ? asistencia.getUsuario().getId() : null)
                .usuarioNombre(asistencia.getUsuario() != null ? asistencia.getUsuario().getNombre() : null)
                .nombreExterno(asistencia.getNombreExterno())
                .invitadoPorId(asistencia.getInvitadoPor() != null ? asistencia.getInvitadoPor().getId() : null)
                .invitadoPorNombre(asistencia.getInvitadoPor() != null ? asistencia.getInvitadoPor().getNombre() : null)
                .estado(asistencia.getEstado())
                .posicionId(asistencia.getPosicion() != null ? asistencia.getPosicion().getId() : null)
                .posicionNombre(asistencia.getPosicion() != null ? asistencia.getPosicion().getNombre() : null)
                .equipoId(asistencia.getEquipo() != null ? asistencia.getEquipo().getId() : null)
                .equipoNombre(asistencia.getEquipo() != null ? asistencia.getEquipo().getNombre() : null)
                .fechaRespuesta(asistencia.getFechaRespuesta())
                .build();
    }
}