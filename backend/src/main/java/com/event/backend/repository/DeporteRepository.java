package com.event.backend.repository;

import com.event.backend.model.Deporte;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DeporteRepository extends JpaRepository<Deporte, Long> {
    boolean existsByNombreIgnoreCase(String nombre);
    Optional<Deporte> findByNombreIgnoreCase(String nombre);
}
