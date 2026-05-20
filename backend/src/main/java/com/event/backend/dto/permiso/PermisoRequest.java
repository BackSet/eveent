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
public class PermisoRequest {

    @NotBlank(message = "La clave del permiso es obligatoria")
    @Size(max = 50, message = "La clave del permiso no puede exceder los 50 caracteres")
    private String clave;

    @NotBlank(message = "La descripcion es obligatoria")
    @Size(max = 200, message = "La descripcion no puede exceder los 200 caracteres")
    private String descripcion;
}
