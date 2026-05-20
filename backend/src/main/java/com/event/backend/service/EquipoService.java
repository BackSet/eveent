package com.event.backend.service;

import com.event.backend.dto.equipo.EquipoRequest;
import com.event.backend.dto.equipo.EquipoResponse;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.EquiposConvocatoria;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.repository.EquiposConvocatoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class EquipoService {

    private final EquiposConvocatoriaRepository equipoRepository;
    private final ConvocatoriaRepository convocatoriaRepository;

    @Transactional(readOnly = true)
    public List<EquipoResponse> findByConvocatoriaId(Long convocatoriaId) {
        return equipoRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EquipoResponse findById(Long id) {
        return equipoRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Equipo no encontrado con id: " + id));
    }

    public EquipoResponse create(Long convocatoriaId, EquipoRequest request) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada con id: " + convocatoriaId));

        EquiposConvocatoria equipo = EquiposConvocatoria.builder()
                .convocatoria(convocatoria)
                .nombre(request.getNombre())
                .color(request.getColor())
                .build();
        equipo = equipoRepository.save(equipo);
        return toResponse(equipo);
    }

    public EquipoResponse update(Long id, EquipoRequest request) {
        EquiposConvocatoria equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Equipo no encontrado con id: " + id));

        if (request.getNombre() != null) equipo.setNombre(request.getNombre());
        if (request.getColor() != null) equipo.setColor(request.getColor());

        equipo = equipoRepository.save(equipo);
        return toResponse(equipo);
    }

    public void delete(Long id) {
        if (!equipoRepository.existsById(id)) {
            throw new RuntimeException("Equipo no encontrado con id: " + id);
        }
        equipoRepository.deleteById(id);
    }

    private EquipoResponse toResponse(EquiposConvocatoria equipo) {
        return EquipoResponse.builder()
                .id(equipo.getId())
                .nombre(equipo.getNombre())
                .color(equipo.getColor())
                .convocatoriaId(equipo.getConvocatoria().getId())
                .build();
    }
}