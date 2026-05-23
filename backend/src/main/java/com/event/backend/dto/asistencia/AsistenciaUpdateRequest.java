package com.event.backend.dto.asistencia;

import com.event.backend.model.EstadoAsistencia;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AsistenciaUpdateRequest {
    @NotNull(message = "El estado es obligatorio")
    private EstadoAsistencia estado;
    private String nombreExterno;
    private Long posicionPreferidaId;
    private Long bandoId;
    private java.util.List<Long> posicionesPreferidasIds;
}
