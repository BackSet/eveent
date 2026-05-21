package com.event.backend.repository;

import com.event.backend.model.UsuarioPosicion;
import com.event.backend.model.UsuarioPosicionId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UsuarioPosicionRepository extends JpaRepository<UsuarioPosicion, UsuarioPosicionId> {
    List<UsuarioPosicion> findByUsuarioId(Long usuarioId);
    List<UsuarioPosicion> findByUsuarioIdIn(List<Long> usuarioIds);
    void deleteByUsuarioId(Long usuarioId);
}
