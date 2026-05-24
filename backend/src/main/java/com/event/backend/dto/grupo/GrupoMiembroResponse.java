package com.event.backend.dto.grupo;

import com.event.backend.dto.usuario.UsuarioPosicionDto;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrupoMiembroResponse {
    private Long id;
    private String nombre;
    private String username;
    private String email;
    private Integer numeroCamiseta;
    private List<UsuarioPosicionDto> posiciones;
    private LocalDateTime fechaFinSuspension;
    private String motivoSuspension;
}
