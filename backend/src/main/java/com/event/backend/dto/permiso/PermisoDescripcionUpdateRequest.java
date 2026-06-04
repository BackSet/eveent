package com.event.backend.dto.permiso;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermisoDescripcionUpdateRequest {

    @NotBlank(message = "El nombre del permiso es obligatorio")
    @Size(max = 200, message = "El nombre no puede exceder los 200 caracteres")
    private String descripcion;
}
