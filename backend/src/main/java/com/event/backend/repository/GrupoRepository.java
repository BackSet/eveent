package com.event.backend.repository;

import com.event.backend.model.Grupo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GrupoRepository extends JpaRepository<Grupo, Long> {
    @EntityGraph(attributePaths = {"miembros"})
    List<Grupo> findAll();

    @EntityGraph(attributePaths = {"miembros"})
    Optional<Grupo> findById(Long id);

    List<Grupo> findByCreadoPorId(Long creadoPorId);
}
