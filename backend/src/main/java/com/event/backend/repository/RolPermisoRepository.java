package com.event.backend.repository;

import com.event.backend.model.RolPermiso;
import com.event.backend.model.RolPermisoId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RolPermisoRepository extends JpaRepository<RolPermiso, RolPermisoId> {
    List<RolPermiso> findByIdRolId(Long rolId);
    void deleteByIdRolId(Long rolId);
}
