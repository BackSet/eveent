package com.event.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class GrupoJugadorId implements Serializable {
    @Column(name = "grupo_id")
    private Long grupoId;

    @Column(name = "usuario_id")
    private Long usuarioId;
}
