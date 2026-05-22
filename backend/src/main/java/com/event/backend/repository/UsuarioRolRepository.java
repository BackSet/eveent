package com.event.backend.repository;

import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, UsuarioRolId> {
    @EntityGraph(attributePaths = {"rol"})
    List<UsuarioRol> findByIdUsuarioId(Long usuarioId);

    List<UsuarioRol> findByIdRolId(Long rolId);

    @Query("SELECT ur FROM UsuarioRol ur JOIN FETCH ur.rol WHERE ur.id.usuarioId IN :userIds")
    List<UsuarioRol> findAllByUsuarioIdIn(@Param("userIds") List<Long> userIds);
}
