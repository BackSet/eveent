package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bandos_convocatoria")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BandoConvocatoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 20)
    private String color;
}
