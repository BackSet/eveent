package com.event.backend.service;

import com.event.backend.dto.posicion.PosicionRequest;
import com.event.backend.dto.posicion.PosicionResponse;
import com.event.backend.model.Deporte;
import com.event.backend.model.PosicionesDeporte;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.PosicionesDeporteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PosicionService {

    private final PosicionesDeporteRepository posicionRepository;
    private final DeporteRepository deporteRepository;

    @Transactional(readOnly = true)
    public List<PosicionResponse> findByDeporteId(Long deporteId) {
        return posicionRepository.findByDeporteId(deporteId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PosicionResponse findById(Long id) {
        return posicionRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Posicion no encontrada con id: " + id));
    }

    public PosicionResponse create(Long deporteId, PosicionRequest request) {
        Deporte deporte = deporteRepository.findById(deporteId)
                .orElseThrow(() -> new RuntimeException("Deporte no encontrado con id: " + deporteId));

        PosicionesDeporte posicion = PosicionesDeporte.builder()
                .deporte(deporte)
                .nombre(request.getNombre())
                .abreviatura(request.getAbreviatura())
                .build();
        posicion = posicionRepository.save(posicion);
        return toResponse(posicion);
    }

    public PosicionResponse update(Long id, PosicionRequest request) {
        PosicionesDeporte posicion = posicionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Posicion no encontrada con id: " + id));

        posicion.setNombre(request.getNombre());
        posicion.setAbreviatura(request.getAbreviatura());
        posicion = posicionRepository.save(posicion);
        return toResponse(posicion);
    }

    public void delete(Long id) {
        if (!posicionRepository.existsById(id)) {
            throw new RuntimeException("Posicion no encontrada con id: " + id);
        }
        posicionRepository.deleteById(id);
    }

    private PosicionResponse toResponse(PosicionesDeporte posicion) {
        return PosicionResponse.builder()
                .id(posicion.getId())
                .nombre(posicion.getNombre())
                .abreviatura(posicion.getAbreviatura())
                .deporteId(posicion.getDeporte().getId())
                .build();
    }
}