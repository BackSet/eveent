package com.event.backend.repository;

import com.event.backend.model.PosicionesDeporte;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PosicionesDeporteRepository extends JpaRepository<PosicionesDeporte, Long> {
    List<PosicionesDeporte> findByDeporteId(Long deporteId);
}
