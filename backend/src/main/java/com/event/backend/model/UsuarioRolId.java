package com.event.backend.model;

import jakarta.persistence.*;
import java.io.Serializable;
import lombok.*;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class UsuarioRolId implements Serializable {

    private Long usuarioId;
    private Long rolId;
}
