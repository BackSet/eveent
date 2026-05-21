package com.event.backend.dto.recurrencia;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor @AllArgsConstructor
public class ConvocatoriaRecurrenteResponse {
    private Long id;
    private String titulo;
    private String descripcion;
    private Long deporteId;
    private String deporteNombre;
    private String lugar;
    private Integer cupoMaximo;
    private String categoria;
    private String patron;
    private String diasSemana;
    private String horaEvento;
    private String horaPartido;
    private Long grupoDestinoId;
    private String grupoDestinoNombre;
    private Boolean activo;
    private LocalDateTime fechaCreacion;
}
