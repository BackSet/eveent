package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "usuario_posiciones")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UsuarioPosicion {

    @EmbeddedId
    private UsuarioPosicionId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("usuarioId")
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("posicionId")
    @JoinColumn(name = "posicion_id")
    private PosicionesDeporte posicion;

    @Column(nullable = false)
    private Integer prioridad;
}
