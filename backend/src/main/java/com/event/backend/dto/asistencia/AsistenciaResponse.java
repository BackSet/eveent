package com.event.backend.dto.asistencia;

import com.event.backend.model.EstadoAsistencia;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AsistenciaResponse {
    private Long id;
    private Long convocatoriaId;
    private String convocatoriaTitulo;
    private java.time.LocalDateTime convocatoriaFechaHora;
    private java.time.LocalDateTime convocatoriaFechaHoraFin;
    private String convocatoriaEstado;
    private String convocatoriaLugar;
    private String convocatoriaDeporteNombre;
    private Long usuarioId;
    private String usuarioNombre;
    private String usuarioUsername;
    private String nombreExterno;
    private Long invitadoPorId;
    private String invitadoPorNombre;
    private EstadoAsistencia estado;
    private Long posicionPreferidaId;
    private String posicionPreferidaNombre;
    private Long posicionAsignadaId;
    private String posicionAsignadaNombre;
    private java.util.List<Long> posicionesPreferidasIds;
    private java.util.List<String> posicionesPreferidasNombres;
    private Long bandoId;
    private String bandoNombre;
    private Integer numeroCamiseta;
    private LocalDateTime fechaRespuesta;
    private Boolean autoAceptada;
}
