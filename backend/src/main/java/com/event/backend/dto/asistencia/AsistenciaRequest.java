package com.event.backend.dto.asistencia;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsistenciaRequest {

    @NotNull(message = "La convocatoria es obligatoria")
    private Long convocatoriaId;

    private Long posicionId;
    private Long equipoId;
    private String estado;
}