package com.event.backend.repository;

import com.event.backend.model.EquiposConvocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EquiposConvocatoriaRepository extends JpaRepository<EquiposConvocatoria, Long> {
    List<EquiposConvocatoria> findByConvocatoriaId(Long convocatoriaId);
}
