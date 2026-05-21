package com.event.backend.repository;

import com.event.backend.model.Convocatoria;
import com.event.backend.model.EstadoConvocatoria;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {
    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findAll();

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByEstado(EstadoConvocatoria estado);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByCreadoPorId(Long creadoPorId);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    Optional<Convocatoria> findById(Long id);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByEstadoAndFechaHoraBefore(EstadoConvocatoria estado, LocalDateTime fechaHora);

    boolean existsByRecurrenciaIdAndFechaHora(Long recurrenciaId, LocalDateTime fechaHora);
    List<Convocatoria> findByRecurrenciaId(Long recurrenciaId);
}
