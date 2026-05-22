package com.event.backend.repository;

import com.event.backend.model.Asistencia;
import com.event.backend.model.EstadoAsistencia;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {
    @EntityGraph(value = "Asistencia.withRelations")
    List<Asistencia> findByConvocatoriaId(Long convocatoriaId);

    @EntityGraph(value = "Asistencia.withRelations")
    Optional<Asistencia> findByConvocatoriaIdAndUsuarioId(Long convocatoriaId, Long usuarioId);

    @EntityGraph(value = "Asistencia.withRelations")
    List<Asistencia> findByUsuarioId(Long usuarioId);

    @EntityGraph(value = "Asistencia.withRelations")
    List<Asistencia> findByConvocatoriaIdAndEstado(Long convocatoriaId, EstadoAsistencia estado);

    long countByConvocatoriaIdAndEstado(Long convocatoriaId, EstadoAsistencia estado);
}
