package com.event.backend.repository;

import com.event.backend.model.PermisosSistema;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PermisosSistemaRepository extends JpaRepository<PermisosSistema, Long> {
    Optional<PermisosSistema> findByClave(String clave);
    List<PermisosSistema> findByClaveIn(List<String> claves);
}
