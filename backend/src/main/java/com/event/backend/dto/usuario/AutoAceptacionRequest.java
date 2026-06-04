package com.event.backend.dto.usuario;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoAceptacionRequest {
    private String modo;
    private LocalDateTime referencia;
    @Builder.Default
    private boolean aplicarPendientes = false;
}
