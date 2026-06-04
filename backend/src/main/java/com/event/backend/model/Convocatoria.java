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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deporte_id")
    private Deporte deporte;

    @Column(nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "fecha_hora_fin")
    private LocalDateTime fechaHoraFin;

    @Column(name = "duracion_estimada_minutos", columnDefinition = "integer default 60")
    @Builder.Default
    private Integer duracionEstimadaMinutos = 60;

    @Column(length = 200)
    private String lugar;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id", nullable = false)
    private Usuario creadoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
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

    @Column(name = "fecha_apertura_inscripcion")
    private LocalDateTime fechaAperturaInscripcion;

    private LocalDateTime fechaLimiteInscripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuracion_recurrente_id")
    private ConfiguracionRecurrente configuracionRecurrente;

    @Column(name = "manejo_excedente", nullable = false, length = 20)
    @Builder.Default
    private String manejoExcedente = "LISTA_ESPERA";

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_invitacion", nullable = false, length = 20)
    @Builder.Default
    private TipoInvitacion tipoInvitacion = TipoInvitacion.ABIERTA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_id")
    private Grupo grupo;

    @OneToMany(mappedBy = "convocatoria", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private java.util.List<Asistencia> asistencias;
}
