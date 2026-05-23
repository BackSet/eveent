package com.event.backend.service;

import com.event.backend.dto.deporte.DeporteRequest;
import com.event.backend.dto.deporte.DeporteResponse;
import com.event.backend.exception.ConflictException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.Deporte;
import com.event.backend.model.PosicionesDeporte;
import com.event.backend.repository.*;
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
    private final PosicionesDeporteRepository posicionesDeporteRepository;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ConfiguracionRecurrenteRepository configuracionRecurrenteRepository;
    private final jakarta.persistence.EntityManager entityManager;

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

        // 1. Quitar la relación en Convocatorias
        convocatoriaRepository.nullifyDeporte(id);

        // 2. Quitar la relación en Configuraciones Recurrentes
        configuracionRecurrenteRepository.nullifyDeporte(id);

        // 3. Obtener todas las posiciones asociadas a este deporte
        List<PosicionesDeporte> posiciones = posicionesDeporteRepository.findByDeporteId(id);
        if (posiciones != null && !posiciones.isEmpty()) {
            List<Long> posIds = posiciones.stream().map(PosicionesDeporte::getId).toList();

            // 4. Eliminar las preferencias de los usuarios para estas posiciones
            usuarioPosicionRepository.deleteByPosicionIdIn(posIds);

            // 5. Quitar la relación en las asistencias (preferida y asignada)
            asistenciaRepository.nullifyPosicionPreferida(posIds);
            asistenciaRepository.nullifyPosicionAsignada(posIds);

            // Force session flush and clear so that all foreign key constraints referencing
            // positions are physically cleared in PostgreSQL first
            entityManager.flush();
            entityManager.clear();

            // 6. Eliminar las posiciones físicas de la base de datos
            posicionesDeporteRepository.deleteAllInBatch(posiciones);
        } else {
            entityManager.flush();
            entityManager.clear();
        }

        // 7. Finalmente eliminar el deporte
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
