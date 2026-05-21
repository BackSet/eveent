package com.event.backend.repository;

import com.event.backend.model.RolesSistema;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RolesSistemaRepository extends JpaRepository<RolesSistema, Long> {
    Optional<RolesSistema> findByNombre(String nombre);
    List<RolesSistema> findAllByNombreIn(List<String> nombres);
}
