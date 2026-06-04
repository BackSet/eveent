package com.event.backend.dto.deporte;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DeporteRequest {
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 80)
    private String nombre;
    private Boolean esPorEquipos;
    private Integer minJugadoresPorBando;
    private Integer maxJugadoresPorBando;
}
