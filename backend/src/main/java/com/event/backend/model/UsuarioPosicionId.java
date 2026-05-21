package com.event.backend.model;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class UsuarioPosicionId implements Serializable {
    private Long usuarioId;
    private Long posicionId;
}
