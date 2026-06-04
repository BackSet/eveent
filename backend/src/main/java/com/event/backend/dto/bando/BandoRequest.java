package com.event.backend.dto.bando;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BandoRequest {
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 80)
    private String nombre;
    @Size(max = 20)
    private String color;
}
