package com.event.backend.repository;

import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, UsuarioRolId> {
    @EntityGraph(attributePaths = {"rol"})
    List<UsuarioRol> findByIdUsuarioId(Long usuarioId);
    List<UsuarioRol> findByIdRolId(Long rolId);
}
