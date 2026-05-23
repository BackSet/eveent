package com.event.backend.repository;

import com.event.backend.model.UsuarioPosicion;
import com.event.backend.model.UsuarioPosicionId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UsuarioPosicionRepository extends JpaRepository<UsuarioPosicion, UsuarioPosicionId> {
    List<UsuarioPosicion> findByUsuarioId(Long usuarioId);
    List<UsuarioPosicion> findByUsuarioIdIn(List<Long> usuarioIds);
    void deleteByUsuarioId(Long usuarioId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM UsuarioPosicion up WHERE up.posicion.id = :posicionId")
    void deleteByPosicionId(@org.springframework.data.repository.query.Param("posicionId") Long posicionId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM UsuarioPosicion up WHERE up.posicion.id IN :posicionIds")
    void deleteByPosicionIdIn(@org.springframework.data.repository.query.Param("posicionIds") List<Long> posicionIds);
}
