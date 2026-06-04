package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permisos_sistema")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PermisosSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String clave;

    @Column(length = 200)
    private String descripcion;
}
