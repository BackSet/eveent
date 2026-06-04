package com.event.backend.dto.usuario;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioRoleRequest {

    @NotNull(message = "El usuario es obligatorio")
    private Long usuarioId;

    @NotNull(message = "Los roles son obligatorios")
    private List<String> roles;
}