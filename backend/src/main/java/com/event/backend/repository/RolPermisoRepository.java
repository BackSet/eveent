package com.event.backend.repository;

import com.event.backend.model.RolPermiso;
import com.event.backend.model.RolPermisoId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RolPermisoRepository extends JpaRepository<RolPermiso, RolPermisoId> {
    @EntityGraph(attributePaths = {"permiso"})
    List<RolPermiso> findByIdRolId(Long rolId);

    @EntityGraph(attributePaths = {"permiso"})
    List<RolPermiso> findByIdRolIdIn(List<Long> rolIds);

    @Query("SELECT rp FROM RolPermiso rp JOIN FETCH rp.permiso WHERE rp.id.rolId IN :rolIds")
    List<RolPermiso> findAllByRolIdInWithPermiso(@Param("rolIds") List<Long> rolIds);

    void deleteByIdRolId(Long rolId);
    void deleteByIdPermisoId(Long permisoId);
}
