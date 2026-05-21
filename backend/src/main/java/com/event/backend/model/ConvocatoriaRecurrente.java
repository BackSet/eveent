package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "convocatorias_recurrentes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ConvocatoriaRecurrente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 500)
    private String descripcion;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "deporte_id", nullable = false)
    private Deporte deporte;

    @Column(length = 200)
    private String lugar;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id", nullable = false)
    private Usuario creadoPor;

    @Column(nullable = false)
    @Builder.Default
    private Integer cupoMaximo = 0;

    @Column(length = 100)
    private String categoria;

    @Column(nullable = false, length = 20)
    private String patron;

    @Column(length = 50)
    private String diasSemana;

    @Column(nullable = false)
    private LocalTime horaEvento;

    @Column
    private LocalTime horaPartido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_destino_id")
    private Grupo grupoDestino;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}
