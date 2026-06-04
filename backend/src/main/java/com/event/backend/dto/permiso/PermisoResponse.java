package com.event.backend.dto.permiso;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermisoResponse {
    private Long id;
    private String clave;
    private String descripcion;
}