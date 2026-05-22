package com.event.backend.dto.configuracion_recurrente;

import lombok.*;
import java.time.LocalDateTime;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConfiguracionRecurrenteResponse {
    private Long id;
    private String titulo;
    private String descripcion;
    private Long deporteId;
    private String deporteNombre;
    private String lugar;
    private Integer cupoMaximo;
    private String categoria;
    private String rruleExpression;
    private Map<String, HorarioDiaResponse> horariosPorDia;
    private Long grupoDestinoId;
    private String grupoDestinoNombre;
    private Boolean activo;
    private LocalDateTime fechaCreacion;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HorarioDiaResponse {
        private String horaApertura;
        private String horaEvento;
        private Integer duracionMinutos;
    }
}
