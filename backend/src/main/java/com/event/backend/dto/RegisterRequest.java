package com.event.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {

    @NotBlank
    @Size(min = 2, max = 100)
    private String nombre;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    @NotBlank
    @Size(min = 2, max = 50)
    private String username;

    @NotNull
    @Min(1)
    @Max(99)
    private Integer numeroCamiseta;

    private List<Long> posicionIds;

    /** Si es true, asigna rol Organizador en lugar de Jugador. */
    private boolean registerAsOrganizador;
}
