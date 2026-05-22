package com.event.backend.dto.bando;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BandoResponse {
    private Long id;
    private String nombre;
    private String color;
    private Long convocatoriaId;
}
