package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "convocatorias")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@NamedEntityGraph(
    name = "Convocatoria.withDeporteAndCreador",
    attributeNodes = {
        @NamedAttributeNode("deporte"),
        @NamedAttributeNode("creadoPor")
    }
)
public class Convocatoria {

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

    @Column(nullable = false)
    private LocalDateTime fechaHora;

    @Column(length = 200)
    private String lugar;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id", nullable = false)
    private Usuario creadoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoConvocatoria estado = EstadoConvocatoria.BORRADOR;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private Integer cupoMaximo = 0;

    @Column(length = 100)
    private String categoria;

    private LocalDateTime fechaLimiteInscripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recurrencia_id")
    private ConvocatoriaRecurrente recurrencia;

    @Column(name = "manejo_excedente", nullable = false, length = 20)
    @Builder.Default
    private String manejoExcedente = "LISTA_ESPERA";
}
