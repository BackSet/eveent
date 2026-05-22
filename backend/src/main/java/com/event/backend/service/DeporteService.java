package com.event.backend.service;

import com.event.backend.dto.deporte.DeporteRequest;
import com.event.backend.dto.deporte.DeporteResponse;
import com.event.backend.exception.ConflictException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Deporte;
import com.event.backend.repository.DeporteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DeporteService {

    private final DeporteRepository deporteRepository;

    @Transactional(readOnly = true)
    @Cacheable("deportes")
    public List<DeporteResponse> findAll() {
        return deporteRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeporteResponse findById(Long id) {
        return deporteRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Deporte no encontrado con id: " + id));
    }

    @CacheEvict(value = "deportes", allEntries = true)
    public DeporteResponse create(DeporteRequest request) {
        if (deporteRepository.existsByNombreIgnoreCase(request.getNombre())) {
            throw new ConflictException("Ya existe un deporte con el nombre: " + request.getNombre());
        }

        Deporte deporte = Deporte.builder()
                .nombre(request.getNombre())
                .esPorEquipos(request.getEsPorEquipos() != null ? request.getEsPorEquipos() : true)
                .minJugadoresPorBando(request.getMinJugadoresPorBando() != null ? request.getMinJugadoresPorBando() : 1)
                .maxJugadoresPorBando(request.getMaxJugadoresPorBando() != null ? request.getMaxJugadoresPorBando() : 11)
                .build();
        deporte = deporteRepository.save(deporte);
        return toResponse(deporte);
    }

    @CacheEvict(value = "deportes", allEntries = true)
    public DeporteResponse update(Long id, DeporteRequest request) {
        Deporte deporte = deporteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Deporte no encontrado con id: " + id));

        if (deporteRepository.existsByNombreIgnoreCase(request.getNombre()) &&
                !deporte.getNombre().equalsIgnoreCase(request.getNombre())) {
            throw new ConflictException("Ya existe un deporte con el nombre: " + request.getNombre());
        }

        deporte.setNombre(request.getNombre());
        if (request.getEsPorEquipos() != null) deporte.setEsPorEquipos(request.getEsPorEquipos());
        if (request.getMinJugadoresPorBando() != null) deporte.setMinJugadoresPorBando(request.getMinJugadoresPorBando());
        if (request.getMaxJugadoresPorBando() != null) deporte.setMaxJugadoresPorBando(request.getMaxJugadoresPorBando());

        deporte = deporteRepository.save(deporte);
        return toResponse(deporte);
    }

    @CacheEvict(value = "deportes", allEntries = true)
    public void delete(Long id) {
        if (!deporteRepository.existsById(id)) {
            throw new NotFoundException("Deporte no encontrado con id: " + id);
        }
        deporteRepository.deleteById(id);
    }

    private DeporteResponse toResponse(Deporte deporte) {
        return DeporteResponse.builder()
                .id(deporte.getId())
                .nombre(deporte.getNombre())
                .esPorEquipos(deporte.getEsPorEquipos())
                .minJugadoresPorBando(deporte.getMinJugadoresPorBando())
                .maxJugadoresPorBando(deporte.getMaxJugadoresPorBando())
                .build();
    }
}
