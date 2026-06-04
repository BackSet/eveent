package com.event.backend.repository;

import com.event.backend.model.GrupoJugador;
import com.event.backend.model.GrupoJugadorId;
import com.event.backend.model.RolGrupo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GrupoJugadorRepository extends JpaRepository<GrupoJugador, GrupoJugadorId> {
    @EntityGraph(attributePaths = {"grupo", "usuario", "asignadoPor"})
    List<GrupoJugador> findByIdGrupoIdOrderByUsuarioNombreAsc(Long grupoId);

    Optional<GrupoJugador> findByIdGrupoIdAndIdUsuarioId(Long grupoId, Long usuarioId);

    boolean existsByIdGrupoIdAndIdUsuarioIdAndRolGrupoIn(Long grupoId, Long usuarioId, Collection<RolGrupo> roles);

    boolean existsByIdUsuarioIdAndRolGrupoIn(Long usuarioId, Collection<RolGrupo> roles);
}
