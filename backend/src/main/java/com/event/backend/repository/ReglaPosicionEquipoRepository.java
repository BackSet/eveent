package com.event.backend.repository;

import com.event.backend.model.ReglaPosicionEquipo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReglaPosicionEquipoRepository extends JpaRepository<ReglaPosicionEquipo, Long> {
    @EntityGraph(attributePaths = {"deporte", "posicion"})
    List<ReglaPosicionEquipo> findByDeporteIdAndActivoTrueOrderByPosicionNombreAsc(Long deporteId);
}
