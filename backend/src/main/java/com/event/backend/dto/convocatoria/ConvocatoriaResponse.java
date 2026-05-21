package com.event.backend.dto.convocatoria;

import com.event.backend.model.EstadoConvocatoria;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConvocatoriaResponse {
    private Long id;
    private String titulo;
    private String descripcion;
    private Long deporteId;
    private String deporteNombre;
    private LocalDateTime fechaHora;
    private String lugar;
    private Long creadoPorId;
    private String creadoPorNombre;
    private EstadoConvocatoria estado;
    private LocalDateTime fechaCreacion;
    private Integer cupoMaximo;
    private String categoria;
    private LocalDateTime fechaLimiteInscripcion;
    private String manejoExcedente;
    private Long recurrenciaId;
}