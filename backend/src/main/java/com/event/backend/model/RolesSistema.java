package com.event.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles_sistema")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RolesSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String nombre;
}
