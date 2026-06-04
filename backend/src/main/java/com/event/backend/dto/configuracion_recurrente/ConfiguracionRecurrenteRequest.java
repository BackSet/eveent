package com.event.backend.dto.configuracion_recurrente;

import com.event.backend.model.ModoFormacion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConfiguracionRecurrenteRequest {
    @NotBlank(message = "El titulo es obligatorio")
    private String titulo;
    private String descripcion;
    @NotNull(message = "El deporte es obligatorio")
    private Long deporteId;
    private String lugar;
    private Integer cupoMaximo;
    private String categoria;
    private String rruleExpression;
    private Map<String, HorarioDiaRequest> horariosPorDia;
    private Long grupoDestinoId;
    private ModoFormacion modoFormacion;
    private List<Long> grupoEquipoIds;
    private Boolean activo;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class HorarioDiaRequest {
        private String horaApertura;
        private String horaEvento;
        private Integer duracionMinutos;
    }
}
