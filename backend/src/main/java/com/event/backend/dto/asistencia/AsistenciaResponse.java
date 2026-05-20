package com.event.backend.dto.asistencia;

import com.event.backend.model.EstadoAsistencia;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    private Long posicionId;
    private String posicionNombre;
    private Long equipoId;
    private String equipoNombre;
    private LocalDateTime fechaRespuesta;
}