package com.event.backend.repository;

import com.event.backend.model.Convocatoria;
import com.event.backend.model.EstadoConvocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {
    List<Convocatoria> findByEstado(EstadoConvocatoria estado);
    List<Convocatoria> findByCreadoPorId(Long creadoPorId);
}
