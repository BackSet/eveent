package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "grupo_jugadores")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class GrupoJugador {

    @EmbeddedId
    private GrupoJugadorId id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @MapsId("grupoId")
    @JoinColumn(name = "grupo_id", nullable = false)
    private Grupo grupo;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @MapsId("usuarioId")
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol_grupo", nullable = false, length = 30, columnDefinition = "VARCHAR(30) DEFAULT 'JUGADOR'")
    @Builder.Default
    private RolGrupo rolGrupo = RolGrupo.JUGADOR;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_por_id")
    private Usuario asignadoPor;

    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMP DEFAULT NOW()")
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    private LocalDateTime fechaActualizacion;

    @PreUpdate
    public void preUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
