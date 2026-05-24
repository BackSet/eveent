package com.event.backend.dto.convocatoria;

import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.TipoInvitacion;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConvocatoriaResponse {
    private Long id;
    private String titulo;
    private String descripcion;
    private Long deporteId;
    private String deporteNombre;
    private LocalDateTime fechaHora;
    private LocalDateTime fechaHoraFin;
    private Integer duracionEstimadaMinutos;
    private String lugar;
    private Long creadoPorId;
    private String creadoPorNombre;
    private EstadoConvocatoria estado;
    private LocalDateTime fechaCreacion;
    private Integer cupoMaximo;
    private String categoria;
    private LocalDateTime fechaAperturaInscripcion;
    private LocalDateTime fechaLimiteInscripcion;
    private String manejoExcedente;
    private Long configuracionRecurrenteId;
    private Boolean deporteEsPorEquipos;
    private TipoInvitacion tipoInvitacion;
    private Long grupoId;
    private String grupoNombre;
    private Boolean puedeVer;
    private Boolean puedeInscribirse;
    /** true si es BORRADOR y la fecha/hora del evento ya no es publicable */
    private Boolean fechaEventoPasada;
    /** true si el borrador puede publicarse (abrir) en este momento */
    private Boolean puedePublicarse;
}
