package com.event.backend.repository;

import com.event.backend.model.ConvocatoriaRecurrente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConvocatoriaRecurrenteRepository extends JpaRepository<ConvocatoriaRecurrente, Long> {
    List<ConvocatoriaRecurrente> findByActivoTrue();
    List<ConvocatoriaRecurrente> findByCreadoPorId(Long creadoPorId);
}
