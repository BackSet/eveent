package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "posiciones_deporte")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PosicionesDeporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "deporte_id", nullable = false)
    private Deporte deporte;

    @Column(nullable = false, length = 60)
    private String nombre;

    @Column(length = 10)
    private String abreviatura;
}
