package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "asistencias")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@NamedEntityGraph(
    name = "Asistencia.withRelations",
    attributeNodes = {
        @NamedAttributeNode("convocatoria"),
        @NamedAttributeNode("usuario"),
        @NamedAttributeNode("invitadoPor"),
        @NamedAttributeNode("posicionPreferida"),
        @NamedAttributeNode("posicionAsignada"),
        @NamedAttributeNode("bando")
    }
)
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "nombre_externo", length = 120)
    private String nombreExterno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitado_por_id")
    private Usuario invitadoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoAsistencia estado = EstadoAsistencia.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posicion_preferida_id")
    private PosicionesDeporte posicionPreferida;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "asistencias_posiciones_preferidas",
        joinColumns = @JoinColumn(name = "asistencia_id"),
        inverseJoinColumns = @JoinColumn(name = "posicion_id")
    )
    @OrderColumn(name = "prioridad")
    @Builder.Default
    private java.util.List<PosicionesDeporte> posicionesPreferidas = new java.util.ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posicion_asignada_id")
    private PosicionesDeporte posicionAsignada;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bando_id")
    private BandoConvocatoria bando;

    @Builder.Default
    private LocalDateTime fechaRespuesta = LocalDateTime.now();

    @Transient
    @Builder.Default
    private boolean autoAceptada = false;
}
