package com.event.backend.dto.equipo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipoResponse {
    private Long id;
    private String nombre;
    private String color;
    private Long convocatoriaId;
}