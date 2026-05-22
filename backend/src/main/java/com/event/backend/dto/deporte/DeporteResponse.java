package com.event.backend.dto.deporte;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DeporteResponse {
    private Long id;
    private String nombre;
    private Boolean esPorEquipos;
    private Integer minJugadoresPorBando;
    private Integer maxJugadoresPorBando;
}
