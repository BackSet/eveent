package com.event.backend.dto.usuario;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoAceptacionResponse {
    private String modo;
    private LocalDateTime referencia;
    private boolean activa;
    private String resumen;
    private int pendientesAplicables;
    private int pendientesAplicados;
}
