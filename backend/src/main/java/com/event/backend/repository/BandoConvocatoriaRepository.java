package com.event.backend.repository;

import com.event.backend.model.BandoConvocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BandoConvocatoriaRepository extends JpaRepository<BandoConvocatoria, Long> {
    List<BandoConvocatoria> findByConvocatoriaId(Long convocatoriaId);
}
