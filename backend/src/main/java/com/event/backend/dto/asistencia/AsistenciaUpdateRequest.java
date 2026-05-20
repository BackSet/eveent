package com.event.backend.dto.asistencia;

import com.event.backend.model.EstadoAsistencia;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsistenciaUpdateRequest {

    @NotNull(message = "El estado es obligatorio")
    private EstadoAsistencia estado;

    private Long posicionId;
    private Long equipoId;
}