package com.event.backend.dto.convocatoria;

import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.TipoInvitacion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConvocatoriaRequest {
    @NotBlank(message = "El titulo es obligatorio")
    @Size(min = 3, max = 150)
    private String titulo;
    @Size(max = 500)
    private String descripcion;
    @NotNull(message = "El deporte es obligatorio")
    private Long deporteId;
    @NotNull(message = "La fecha y hora es obligatoria")
    private LocalDateTime fechaHora;
    private LocalDateTime fechaHoraFin;
    private Integer duracionEstimadaMinutos;
    @Size(max = 200)
    private String lugar;
    private EstadoConvocatoria estado;
    private Integer cupoMaximo;
    @Size(max = 100)
    private String categoria;
    private LocalDateTime fechaAperturaInscripcion;
    private LocalDateTime fechaLimiteInscripcion;
    private String manejoExcedente;
    private TipoInvitacion tipoInvitacion;
    private Long grupoId;
}
