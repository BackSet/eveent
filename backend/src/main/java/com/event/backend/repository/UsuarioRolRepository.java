package com.event.backend.repository;

import com.event.backend.model.UsuarioRol;
import com.event.backend.model.UsuarioRolId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, UsuarioRolId> {
    List<UsuarioRol> findByIdUsuarioId(Long usuarioId);
    List<UsuarioRol> findByIdRolId(Long rolId);
}
