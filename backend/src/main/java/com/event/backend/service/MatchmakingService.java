package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.*;
import com.event.backend.repository.*;
import com.event.backend.security.SecurityService;
import com.event.backend.util.ConvocatoriaScheduleHelper;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MatchmakingService {

    private final AsistenciaRepository asistenciaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final BandoConvocatoriaRepository bandoRepository;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final PosicionesDeporteRepository posicionesDeporteRepository;
    private final AsistenciaMapper asistenciaMapper;
    private final AsistenciaService asistenciaService;
    private final SecurityService securityService;
    private final ConvocatoriaAccessService convocatoriaAccessService;

    public List<AsistenciaResponse> runMatchmaking(Long convocatoriaId, Integer numEquipos) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + convocatoriaId));

        Long currentUserId = securityService.getCurrentUserId();
        if (!convocatoriaAccessService.canManageAttendance(convocatoria, currentUserId)) {
            throw new com.event.backend.exception.ForbiddenException(
                    "No tienes permiso para generar bandos en esta convocatoria.");
        }

        ConvocatoriaScheduleHelper.assertConvocatoriaMatchmakingAllowed(convocatoria, LocalDateTime.now());

        ModoFormacion modoFormacion = convocatoria.getModoFormacion() != null
                ? convocatoria.getModoFormacion()
                : ModoFormacion.BALANCEADO;
        if (modoFormacion == ModoFormacion.EQUIPOS_POR_GRUPO) {
            throw new com.event.backend.exception.BusinessException(
                    "Esta convocatoria usa equipos por grupo. El balanceo automatico no se aplica a este modo.");
        }

        List<Asistencia> allAsistencias = asistenciaRepository.findByConvocatoriaId(convocatoriaId);

        List<Asistencia> confirmados = allAsistencias.stream()
                .filter(a -> a.getEstado() == EstadoAsistencia.ASISTIRE || a.getEstado() == EstadoAsistencia.LISTA_ESPERA)
                .sorted(Comparator.comparing(Asistencia::getFechaRespuesta))
                .collect(Collectors.toList());

        List<Asistencia> playersToMatch = new ArrayList<>();
        List<Asistencia> modifiedAsistencias = new ArrayList<>();

        if (convocatoria.getCupoMaximo() != null && convocatoria.getCupoMaximo() > 0 && confirmados.size() > convocatoria.getCupoMaximo()) {
            for (int i = 0; i < confirmados.size(); i++) {
                Asistencia a = confirmados.get(i);
                if (i < convocatoria.getCupoMaximo()) {
                    a.setEstado(EstadoAsistencia.ASISTIRE);
                    playersToMatch.add(a);
                } else {
                    if ("LISTA_ESPERA".equals(convocatoria.getManejoExcedente())) {
                        a.setEstado(EstadoAsistencia.LISTA_ESPERA);
                        a.setBando(null);
                    } else {
                        a.setEstado(EstadoAsistencia.ASISTIRE);
                        playersToMatch.add(a);
                    }
                }
                modifiedAsistencias.add(a);
            }
        } else {
            for (Asistencia a : confirmados) {
                a.setEstado(EstadoAsistencia.ASISTIRE);
                playersToMatch.add(a);
                modifiedAsistencias.add(a);
            }
        }

        if (!modifiedAsistencias.isEmpty()) {
            asistenciaRepository.saveAll(modifiedAsistencias);
        }

        if (playersToMatch.isEmpty()) {
            return List.of();
        }

        Deporte deporte = convocatoria.getDeporte();
        if (deporte == null) {
            throw new com.event.backend.exception.ConflictException("No se puede realizar el emparejamiento porque la convocatoria no tiene un deporte asociado.");
        }
        boolean esPorEquipos = deporte.getEsPorEquipos() != null ? deporte.getEsPorEquipos() : true;

        int N;
        if (numEquipos != null && numEquipos > 0) {
            N = numEquipos;
        } else {
            List<BandoConvocatoria> existing = bandoRepository.findByConvocatoriaId(convocatoriaId);
            if (!existing.isEmpty()) {
                N = existing.size();
            } else {
                N = esPorEquipos ? 2 : 1;
            }
        }

        if (!esPorEquipos && numEquipos == null && bandoRepository.findByConvocatoriaId(convocatoriaId).isEmpty()) {
            return matchmakeIndividual(convocatoria, playersToMatch, allAsistencias);
        } else {
            return matchmakeByTeams(convocatoria, playersToMatch, allAsistencias, N);
        }
    }

    public List<AsistenciaResponse> runMatchmaking(Long convocatoriaId) {
        return runMatchmaking(convocatoriaId, null);
    }

    private List<AsistenciaResponse> matchmakeIndividual(Convocatoria convocatoria, List<Asistencia> players, List<Asistencia> allAsistencias) {
        List<BandoConvocatoria> existingBandos = bandoRepository.findByConvocatoriaId(convocatoria.getId());
        for (BandoConvocatoria b : existingBandos) {
            bandoRepository.delete(b);
        }

        List<Asistencia> modified = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) {
            Asistencia player = players.get(i);
            String bandoNombre = "Jugador " + (i + 1);
            BandoConvocatoria bando = BandoConvocatoria.builder()
                    .convocatoria(convocatoria)
                    .nombre(bandoNombre)
                    .color(null)
                    .build();
            bando = bandoRepository.save(bando);
            player.setBando(bando);

            PosicionesDeporte assignedPos = getPreferredPosition(player);
            if (assignedPos != null) player.setPosicionAsignada(assignedPos);

            modified.add(player);
        }

        if (!modified.isEmpty()) {
            asistenciaRepository.saveAll(modified);
        }

        List<AsistenciaResponse> responses = asistenciaRepository.findByConvocatoriaId(convocatoria.getId()).stream()
                .map(asistenciaMapper::toResponse)
                .collect(Collectors.toList());
        Long deporteId = convocatoria.getDeporte() != null ? convocatoria.getDeporte().getId() : null;
        asistenciaService.populateUserPositions(responses, deporteId);
        return responses;
    }

    private List<AsistenciaResponse> matchmakeByTeams(Convocatoria convocatoria, List<Asistencia> playersToMatch, List<Asistencia> allAsistencias, int numEquipos) {
        List<BandoConvocatoria> teams = bandoRepository.findByConvocatoriaId(convocatoria.getId());
        List<BandoConvocatoria> finalTeams = new ArrayList<>(teams);
        int N = numEquipos;

        if (finalTeams.size() < N) {
            String[] names = {"A", "B", "C", "D", "E", "F", "G", "H"};
            String[] colors = {"Azul", "Rojo", "Verde", "Amarillo", "Naranja", "Gris", "Celeste", "Negro"};
            int needed = N - finalTeams.size();
            for (int i = 0; i < needed; i++) {
                int idx = finalTeams.size();
                String name = "Equipo " + (idx < names.length ? names[idx] : String.valueOf(idx + 1));
                String color = idx < colors.length ? colors[idx] : "Gris";
                BandoConvocatoria newTeam = bandoRepository.save(BandoConvocatoria.builder()
                        .convocatoria(convocatoria).nombre(name).color(color).build());
                finalTeams.add(newTeam);
            }
        } else if (finalTeams.size() > N) {
            while (finalTeams.size() > N) {
                BandoConvocatoria extra = finalTeams.remove(finalTeams.size() - 1);
                bandoRepository.delete(extra);
            }
        }

        List<Long> userIds = playersToMatch.stream()
                .map(a -> a.getUsuario() != null ? a.getUsuario().getId() : null)
                .filter(Objects::nonNull)
                .toList();

        List<UsuarioPosicion> allUserPositions = userIds.isEmpty() ? List.of() : usuarioPosicionRepository.findByUsuarioIdIn(userIds);
        Map<Long, List<UsuarioPosicion>> userPositionsMap = allUserPositions.stream()
                .collect(Collectors.groupingBy(up -> up.getUsuario().getId()));

        List<PosicionesDeporte> sportPositions = posicionesDeporteRepository.findByDeporteId(convocatoria.getDeporte().getId());

        List<Asistencia> playersToDistribute = new ArrayList<>(playersToMatch);
        List<Asistencia> comodinesList = new ArrayList<>();

        if ("COMODIN".equals(convocatoria.getManejoExcedente()) && convocatoria.getCupoMaximo() != null && convocatoria.getCupoMaximo() > 0 && playersToMatch.size() > convocatoria.getCupoMaximo()) {
            int standardCount = convocatoria.getCupoMaximo();
            for (int i = standardCount; i < playersToMatch.size(); i++) {
                Asistencia comodinPlayer = playersToMatch.get(i);
                comodinesList.add(comodinPlayer);
                playersToDistribute.remove(comodinPlayer);
            }
        }

        // Map players to their default/primary position
        Map<Asistencia, PosicionesDeporte> playerPosMap = new HashMap<>();
        for (Asistencia p : playersToDistribute) {
            playerPosMap.put(p, getDefaultPosition(p, sportPositions, userPositionsMap));
        }

        // Group players by position
        Map<PosicionesDeporte, List<Asistencia>> playersByPos = new HashMap<>();
        for (Asistencia p : playersToDistribute) {
            PosicionesDeporte pos = playerPosMap.get(p);
            playersByPos.computeIfAbsent(pos, k -> new ArrayList<>()).add(p);
        }

        // Keep track of bando sizes and specific position counts per bando
        Map<BandoConvocatoria, Integer> bandoTotalSize = new HashMap<>();
        Map<BandoConvocatoria, Map<PosicionesDeporte, Integer>> bandoPosCount = new HashMap<>();
        for (BandoConvocatoria b : finalTeams) {
            bandoTotalSize.put(b, 0);
            bandoPosCount.put(b, new HashMap<>());
        }

        List<Asistencia> modified = new ArrayList<>();

        // Distribute players position by position
        for (Map.Entry<PosicionesDeporte, List<Asistencia>> entry : playersByPos.entrySet()) {
            PosicionesDeporte pos = entry.getKey();
            List<Asistencia> group = entry.getValue();

            for (Asistencia p : group) {
                // Find the best team to assign this player to
                BandoConvocatoria bestBando = null;
                int minPosCount = Integer.MAX_VALUE;
                int minTotalSize = Integer.MAX_VALUE;

                for (BandoConvocatoria b : finalTeams) {
                    int posCount = bandoPosCount.get(b).getOrDefault(pos, 0);
                    int totalSize = bandoTotalSize.get(b);

                    if (posCount < minPosCount) {
                        minPosCount = posCount;
                        minTotalSize = totalSize;
                        bestBando = b;
                    } else if (posCount == minPosCount) {
                        if (totalSize < minTotalSize) {
                            minTotalSize = totalSize;
                            bestBando = b;
                        }
                    }
                }

                if (bestBando != null) {
                    assignPlayer(p, pos, bestBando);
                    bandoTotalSize.put(bestBando, bandoTotalSize.get(bestBando) + 1);
                    bandoPosCount.get(bestBando).put(pos, bandoPosCount.get(bestBando).getOrDefault(pos, 0) + 1);
                    modified.add(p);
                }
            }
        }

        for (Asistencia comodin : comodinesList) {
            comodin.setBando(null);
            PosicionesDeporte pos = getDefaultPosition(comodin, sportPositions, userPositionsMap);
            comodin.setPosicionAsignada(pos);
            modified.add(comodin);
        }

        if (!modified.isEmpty()) {
            asistenciaRepository.saveAll(modified);
        }

        List<AsistenciaResponse> responses = asistenciaRepository.findByConvocatoriaId(convocatoria.getId()).stream()
                .map(asistenciaMapper::toResponse)
                .collect(Collectors.toList());
        Long deporteId = convocatoria.getDeporte() != null ? convocatoria.getDeporte().getId() : null;
        asistenciaService.populateUserPositions(responses, deporteId);
        return responses;
    }

    private PosicionesDeporte getPreferredPosition(Asistencia a) {
        if (a.getPosicionPreferida() != null) return a.getPosicionPreferida();
        return null;
    }

    private PosicionesDeporte getDefaultPosition(Asistencia a, List<PosicionesDeporte> sportPositions, Map<Long, List<UsuarioPosicion>> userPositionsMap) {
        if (a.getPosicionPreferida() != null) return a.getPosicionPreferida();
        if (a.getUsuario() != null) {
            List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(a.getUsuario().getId(), List.of());
            if (!upList.isEmpty()) {
                upList.sort(Comparator.comparing(UsuarioPosicion::getPrioridad));
                return upList.get(0).getPosicion();
            }
        }
        return sportPositions.isEmpty() ? null : sportPositions.get(0);
    }

    private void assignPlayer(Asistencia player, PosicionesDeporte position, BandoConvocatoria team) {
        player.setBando(team);
        player.setPosicionAsignada(position);
    }
}
