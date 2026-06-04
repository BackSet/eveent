package com.event.backend.repository;

import com.event.backend.model.ConfiguracionRecurrente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConfiguracionRecurrenteRepository extends JpaRepository<ConfiguracionRecurrente, Long> {
    List<ConfiguracionRecurrente> findByActivoTrue();
    List<ConfiguracionRecurrente> findByCreadoPorId(Long creadoPorId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE ConfiguracionRecurrente c SET c.deporte = null WHERE c.deporte.id = :deporteId")
    void nullifyDeporte(@org.springframework.data.repository.query.Param("deporteId") Long deporteId);
}
