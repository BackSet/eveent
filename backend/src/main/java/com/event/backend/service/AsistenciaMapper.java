package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.model.Asistencia;
import org.springframework.stereotype.Component;

@Component
public class AsistenciaMapper {

    public AsistenciaResponse toResponse(Asistencia a) {
        return AsistenciaResponse.builder()
                .id(a.getId())
                .convocatoriaId(a.getConvocatoria().getId())
                .convocatoriaTitulo(a.getConvocatoria().getTitulo())
                .convocatoriaFechaHora(a.getConvocatoria().getFechaHora())
                .convocatoriaFechaHoraFin(a.getConvocatoria().getFechaHoraFin())
                .convocatoriaEstado(a.getConvocatoria().getEstado() != null ? a.getConvocatoria().getEstado().name() : null)
                .convocatoriaLugar(a.getConvocatoria().getLugar())
                .convocatoriaDeporteNombre(a.getConvocatoria().getDeporte() != null ? a.getConvocatoria().getDeporte().getNombre() : null)
                .usuarioId(a.getUsuario() != null ? a.getUsuario().getId() : null)
                .usuarioNombre(a.getUsuario() != null ? a.getUsuario().getNombre() : null)
                .usuarioUsername(a.getUsuario() != null ? a.getUsuario().getUsername() : null)
                .nombreExterno(a.getNombreExterno())
                .invitadoPorId(a.getInvitadoPor() != null ? a.getInvitadoPor().getId() : null)
                .invitadoPorNombre(a.getInvitadoPor() != null ? a.getInvitadoPor().getNombre() : null)
                .estado(a.getEstado())
                .posicionPreferidaId(a.getPosicionPreferida() != null ? a.getPosicionPreferida().getId() : null)
                .posicionPreferidaNombre(a.getPosicionPreferida() != null ? a.getPosicionPreferida().getNombre() : null)
                .posicionAsignadaId(a.getPosicionAsignada() != null ? a.getPosicionAsignada().getId() : null)
                .posicionAsignadaNombre(a.getPosicionAsignada() != null ? a.getPosicionAsignada().getNombre() : null)
                .posicionesPreferidasIds(a.getPosicionesPreferidas() != null 
                        ? a.getPosicionesPreferidas().stream().map(com.event.backend.model.PosicionesDeporte::getId).collect(java.util.stream.Collectors.toList()) 
                        : java.util.List.of())
                .posicionesPreferidasNombres(a.getPosicionesPreferidas() != null 
                        ? a.getPosicionesPreferidas().stream().map(com.event.backend.model.PosicionesDeporte::getNombre).collect(java.util.stream.Collectors.toList()) 
                        : java.util.List.of())
                .bandoId(a.getBando() != null ? a.getBando().getId() : null)
                .bandoNombre(a.getBando() != null ? a.getBando().getNombre() : null)
                .numeroCamiseta(a.getUsuario() != null ? a.getUsuario().getNumeroCamiseta() : null)
                .fechaRespuesta(a.getFechaRespuesta())
                .build();
    }
}
