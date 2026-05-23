package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "configuraciones_recurrentes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ConfiguracionRecurrente {

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

    @Column(name = "rrule_expression", length = 255)
    private String rruleExpression;

    @Convert(converter = HorariosMapConverter.class)
    @Column(name = "horarios_por_dia", columnDefinition = "text")
    private Map<String, HorarioDia> horariosPorDia;

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
