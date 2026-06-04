package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reglas_posicion_equipo")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReglaPosicionEquipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "deporte_id", nullable = false)
    private Deporte deporte;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "posicion_id", nullable = false)
    private PosicionesDeporte posicion;

    @Column(name = "cantidad_titulares", nullable = false)
    private Integer cantidadTitulares;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    private LocalDateTime fechaActualizacion;

    @PreUpdate
    public void preUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
