package com.event.backend.repository;

import com.event.backend.model.ConvocatoriaGrupoEquipo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ConvocatoriaGrupoEquipoRepository extends JpaRepository<ConvocatoriaGrupoEquipo, Long> {
    @EntityGraph(attributePaths = {"convocatoria", "grupo", "equipo"})
    List<ConvocatoriaGrupoEquipo> findByConvocatoriaIdOrderByOrdenAsc(Long convocatoriaId);

    long countByConvocatoriaId(Long convocatoriaId);

    boolean existsByEquipoId(Long equipoId);

    @EntityGraph(attributePaths = {"convocatoria", "grupo", "equipo"})
    @Query("SELECT cge FROM ConvocatoriaGrupoEquipo cge JOIN cge.grupo.miembros m WHERE cge.convocatoria.id = :convocatoriaId AND m.id = :usuarioId")
    Optional<ConvocatoriaGrupoEquipo> findParticipatingGroupForUser(
            @Param("convocatoriaId") Long convocatoriaId,
            @Param("usuarioId") Long usuarioId);

    @Query("SELECT cge.grupo.id FROM ConvocatoriaGrupoEquipo cge WHERE cge.convocatoria.id = :convocatoriaId")
    List<Long> findGrupoIdsByConvocatoriaId(@Param("convocatoriaId") Long convocatoriaId);
}
