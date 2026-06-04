package com.event.backend.dto.usuario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponse {
    private Long id;
    private String nombre;
    private String email;
    private String username;
    private Integer numeroCamiseta;
    private List<String> roles;
    private List<String> permissions;
    private List<UsuarioPosicionDto> posiciones;
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaFinSuspension;
    private String motivoSuspension;
    private String autoAceptacionModo;
    private String autoAceptacionResumen;
    private Boolean autoAceptacionActiva;
}