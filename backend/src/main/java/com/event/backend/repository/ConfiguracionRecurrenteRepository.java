package com.event.backend.repository;

import com.event.backend.model.ConfiguracionRecurrente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConfiguracionRecurrenteRepository extends JpaRepository<ConfiguracionRecurrente, Long> {
    List<ConfiguracionRecurrente> findByActivoTrue();
    List<ConfiguracionRecurrente> findByCreadoPorId(Long creadoPorId);
}
