package com.event.backend.dto.grupo;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor @AllArgsConstructor
public class GrupoResponse {
    private Long id;
    private String nombre;
    private String descripcion;
    private Long creadoPorId;
    private String creadoPorNombre;
    private LocalDateTime fechaCreacion;
    private List<Long> miembroIds;
    private List<String> miembroNombres;
    private List<GrupoMiembroResponse> miembros;
    private Boolean puedeGestionar;
    private Boolean puedeAsignarOrganizadores;
}
