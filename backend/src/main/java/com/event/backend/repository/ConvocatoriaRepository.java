package com.event.backend.repository;

import com.event.backend.model.Convocatoria;
import com.event.backend.model.EstadoConvocatoria;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {
    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findAll();

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByEstado(EstadoConvocatoria estado);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByEstadoNot(EstadoConvocatoria estado);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByCreadoPorId(Long creadoPorId);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    Optional<Convocatoria> findById(Long id);

    @EntityGraph(value = "Convocatoria.withDeporteAndCreador")
    List<Convocatoria> findByEstadoAndFechaHoraBefore(EstadoConvocatoria estado, LocalDateTime fechaHora);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Convocatoria c WHERE c.configuracionRecurrente.id = :configuracionId AND c.fechaHora = :fechaHora")
    boolean existsByConfiguracionRecurrenteIdAndFechaHora(@Param("configuracionId") Long configuracionId, @Param("fechaHora") LocalDateTime fechaHora);

    @Query("SELECT c FROM Convocatoria c WHERE c.configuracionRecurrente.id = :configuracionId")
    List<Convocatoria> findByConfiguracionRecurrenteId(@Param("configuracionId") Long configuracionId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Convocatoria c SET c.deporte = null WHERE c.deporte.id = :deporteId")
    void nullifyDeporte(@Param("deporteId") Long deporteId);
}