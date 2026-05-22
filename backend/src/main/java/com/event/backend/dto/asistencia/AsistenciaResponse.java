package com.event.backend.dto.asistencia;

import com.event.backend.model.EstadoAsistencia;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AsistenciaResponse {
    private Long id;
    private Long convocatoriaId;
    private String convocatoriaTitulo;
    private Long usuarioId;
    private String usuarioNombre;
    private String nombreExterno;
    private Long invitadoPorId;
    private String invitadoPorNombre;
    private EstadoAsistencia estado;
    private Long posicionPreferidaId;
    private String posicionPreferidaNombre;
    private Long posicionAsignadaId;
    private String posicionAsignadaNombre;
    private Long bandoId;
    private String bandoNombre;
    private Integer numeroCamiseta;
    private LocalDateTime fechaRespuesta;
}
