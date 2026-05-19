package com.event.backend.dto;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JwtResponse {

    private String token;
    private String email;
    private String nombre;
    private List<String> roles;
}
