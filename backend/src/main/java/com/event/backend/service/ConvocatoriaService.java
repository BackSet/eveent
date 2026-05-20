package com.event.backend.service;

import com.event.backend.dto.convocatoria.ConvocatoriaRequest;
import com.event.backend.dto.convocatoria.ConvocatoriaResponse;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.Deporte;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.Usuario;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaService {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final DeporteRepository deporteRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findAll() {
        return convocatoriaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findByEstado(EstadoConvocatoria estado) {
        return convocatoriaRepository.findByEstado(estado).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaResponse> findByCreador(Long usuarioId) {
        return convocatoriaRepository.findByCreadoPorId(usuarioId).stream()
                .map(this::toResponse)
                .toList();
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

        convocatoriaRepository.deleteById(id);
    }

    private Usuario getCurrentUser() {
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
                .build();
    }
}