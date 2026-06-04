package com.event.backend.dto.posicion;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PosicionResponse {
    private Long id;
    private String nombre;
    private String abreviatura;
    private Long deporteId;
}