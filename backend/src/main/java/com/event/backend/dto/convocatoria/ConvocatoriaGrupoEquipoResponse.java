package com.event.backend.dto.convocatoria;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConvocatoriaGrupoEquipoResponse {
    private Long id;
    private Long convocatoriaId;
    private Long grupoId;
    private String grupoNombre;
    private Long equipoId;
    private String nombreEquipo;
    private Integer cupoTitulares;
    private Integer cupoEspera;
    private Integer orden;
}
