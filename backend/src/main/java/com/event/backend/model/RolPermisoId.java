package com.event.backend.model;

import jakarta.persistence.*;
import java.io.Serializable;
import lombok.*;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class RolPermisoId implements Serializable {

    private Long rolId;
    private Long permisoId;
}
