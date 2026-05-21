package com.event.backend.dto.usuario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioPosicionDto {
    private Long posicionId;
    private String posicionNombre;
    private Long deporteId;
    private String deporteNombre;
    private Integer prioridad;
}
