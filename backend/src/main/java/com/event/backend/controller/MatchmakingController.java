package com.event.backend.controller;

import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.service.AsistenciaService;
import com.event.backend.service.MatchmakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/convocatorias")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;
    private final AsistenciaService asistenciaService;

    @PostMapping("/{id}/matchmaking")
    @PreAuthorize("hasAnyAuthority('dividir_bandos', 'dividir_equipos')")
    public ResponseEntity<List<AsistenciaResponse>> runMatchmaking(
            @PathVariable Long id,
            @RequestParam(required = false) Integer numEquipos) {
        return ResponseEntity.ok(matchmakingService.runMatchmaking(id, numEquipos));
    }

    @PostMapping("/{id}/equipos/recalcular-posiciones")
    @PreAuthorize("hasAnyAuthority('dividir_bandos', 'dividir_equipos', 'editar_convocatorias', 'ver_grupos')")
    public ResponseEntity<List<AsistenciaResponse>> recalcularPosiciones(@PathVariable Long id) {
        return ResponseEntity.ok(asistenciaService.recalcularPosicionesPorEquipo(id));
    }
}
