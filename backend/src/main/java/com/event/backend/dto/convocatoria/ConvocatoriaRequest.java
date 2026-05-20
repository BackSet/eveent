package com.event.backend.dto.convocatoria;

import com.event.backend.model.EstadoConvocatoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConvocatoriaRequest {

    @NotBlank(message = "El titulo es obligatorio")
    @Size(min = 3, max = 150, message = "El titulo debe tener entre 3 y 150 caracteres")
    private String titulo;

    @Size(max = 500, message = "La descripcion debe tener maximo 500 caracteres")
    private String descripcion;

    @NotNull(message = "El deporte es obligatorio")
    private Long deporteId;

    @NotNull(message = "La fecha y hora es obligatoria")
    private LocalDateTime fechaHora;

    @Size(max = 200, message = "El lugar debe tener maximo 200 caracteres")
    private String lugar;

    private EstadoConvocatoria estado;

    private Integer cupoMaximo;

    @Size(max = 100, message = "La categoria debe tener maximo 100 caracteres")
    private String categoria;

    private LocalDateTime fechaLimiteInscripcion;
}