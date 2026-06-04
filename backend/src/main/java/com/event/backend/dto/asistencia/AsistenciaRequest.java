package com.event.backend.dto.asistencia;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AsistenciaRequest {
    @NotNull(message = "La convocatoria es obligatoria")
    private Long convocatoriaId;
    private Long posicionPreferidaId;
    private Long bandoId;
    private String estado;
    private String nombreExterno;
    private java.util.List<Long> posicionesPreferidasIds;
}
