package com.event.backend.repository;

import com.event.backend.model.Deporte;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeporteRepository extends JpaRepository<Deporte, Long> {
}
