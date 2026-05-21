package com.event.backend.dto.recurrencia;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor @AllArgsConstructor
public class ConvocatoriaRecurrenteRequest {

    @NotBlank(message = "El título es obligatorio")
    private String titulo;

    private String descripcion;

    @NotNull(message = "El deporte es obligatorio")
    private Long deporteId;

    private String lugar;

    private Integer cupoMaximo;

    private String categoria;

    @NotBlank(message = "El patrón de recurrencia es obligatorio")
    private String patron;

    private String diasSemana;

    @NotBlank(message = "La hora de apertura es obligatoria")
    private String horaEvento;

    @NotBlank(message = "La hora del partido es obligatoria")
    private String horaPartido;

    private Long grupoDestinoId;

    private Boolean activo;
}
