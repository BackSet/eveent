package com.event.backend.repository;

import com.event.backend.model.Asistencia;
import com.event.backend.model.EstadoAsistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {
    List<Asistencia> findByConvocatoriaId(Long convocatoriaId);
    Optional<Asistencia> findByConvocatoriaIdAndUsuarioId(Long convocatoriaId, Long usuarioId);
    List<Asistencia> findByUsuarioId(Long usuarioId);
    List<Asistencia> findByConvocatoriaIdAndEstado(Long convocatoriaId, EstadoAsistencia estado);
}
