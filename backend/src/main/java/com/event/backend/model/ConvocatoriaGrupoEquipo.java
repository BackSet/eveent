package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "convocatoria_grupo_equipos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ConvocatoriaGrupoEquipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_id", nullable = false)
    private Grupo grupo;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id", nullable = false)
    private BandoConvocatoria equipo;

    @Column(name = "nombre_equipo", nullable = false, length = 120)
    private String nombreEquipo;

    @Column(name = "cupo_titulares", nullable = false)
    private Integer cupoTitulares;

    @Column(name = "cupo_espera")
    private Integer cupoEspera;

    @Column(nullable = false)
    @Builder.Default
    private Integer orden = 0;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    private LocalDateTime fechaActualizacion;

    @PreUpdate
    public void preUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
