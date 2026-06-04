package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "deportes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Deporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String nombre;

    @Column(name = "es_por_equipos", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean esPorEquipos = true;

    @Column(name = "min_jugadores_por_bando", nullable = false, columnDefinition = "integer default 1")
    @Builder.Default
    private Integer minJugadoresPorBando = 1;

    @Column(name = "max_jugadores_por_bando", nullable = false, columnDefinition = "integer default 11")
    @Builder.Default
    private Integer maxJugadoresPorBando = 11;
}
