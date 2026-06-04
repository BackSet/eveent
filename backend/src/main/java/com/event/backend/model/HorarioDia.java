package com.event.backend.model;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HorarioDia implements Serializable {
    private String horaApertura;
    private String horaEvento;
    private Integer duracionMinutos;
}
