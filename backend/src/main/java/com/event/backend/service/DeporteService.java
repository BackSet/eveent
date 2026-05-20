package com.event.backend.service;

import com.event.backend.dto.deporte.DeporteRequest;
import com.event.backend.dto.deporte.DeporteResponse;
import com.event.backend.model.Deporte;
import com.event.backend.repository.DeporteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DeporteService {

    private final DeporteRepository deporteRepository;

    @Transactional(readOnly = true)
    public List<DeporteResponse> findAll() {
        return deporteRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeporteResponse findById(Long id) {
        return deporteRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Deporte no encontrado con id: " + id));
    }

    public DeporteResponse create(DeporteRequest request) {
        if (deporteRepository.findAll().stream()
                .anyMatch(d -> d.getNombre().equalsIgnoreCase(request.getNombre()))) {
            throw new RuntimeException("Ya existe un deporte con el nombre: " + request.getNombre());
        }

        Deporte deporte = Deporte.builder()
                .nombre(request.getNombre())
                .build();
        deporte = deporteRepository.save(deporte);
        return toResponse(deporte);
    }

    public DeporteResponse update(Long id, DeporteRequest request) {
        Deporte deporte = deporteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deporte no encontrado con id: " + id));

        if (deporteRepository.findAll().stream()
                .anyMatch(d -> !d.getId().equals(id) && d.getNombre().equalsIgnoreCase(request.getNombre()))) {
            throw new RuntimeException("Ya existe un deporte con el nombre: " + request.getNombre());
        }

        deporte.setNombre(request.getNombre());
        deporte = deporteRepository.save(deporte);
        return toResponse(deporte);
    }

    public void delete(Long id) {
        if (!deporteRepository.existsById(id)) {
            throw new RuntimeException("Deporte no encontrado con id: " + id);
        }
        deporteRepository.deleteById(id);
    }

    private DeporteResponse toResponse(Deporte deporte) {
        return DeporteResponse.builder()
                .id(deporte.getId())
                .nombre(deporte.getNombre())
                .build();
    }
}