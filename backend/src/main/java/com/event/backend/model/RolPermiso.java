package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rol_permisos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RolPermiso {

    @EmbeddedId
    private RolPermisoId id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @MapsId("rolId")
    @JoinColumn(name = "rol_id", nullable = false)
    private RolesSistema rol;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @MapsId("permisoId")
    @JoinColumn(name = "permiso_id", nullable = false)
    private PermisosSistema permiso;
}
