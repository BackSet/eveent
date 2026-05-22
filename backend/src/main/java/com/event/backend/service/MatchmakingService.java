package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaResponse;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.*;
import com.event.backend.repository.*;
import lombok.RequiredArgsConstructor;
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

    public List<AsistenciaResponse> runMatchmaking(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + convocatoriaId));

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
        boolean esPorEquipos = deporte.getEsPorEquipos() != null ? deporte.getEsPorEquipos() : true;

        if (esPorEquipos) {
            return matchmakeByTeams(convocatoria, playersToMatch, allAsistencias);
        } else {
            return matchmakeIndividual(convocatoria, playersToMatch, allAsistencias);
        }
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

        return asistenciaRepository.findByConvocatoriaId(convocatoria.getId()).stream()
                .map(asistenciaMapper::toResponse)
                .toList();
    }

    private List<AsistenciaResponse> matchmakeByTeams(Convocatoria convocatoria, List<Asistencia> playersToMatch, List<Asistencia> allAsistencias) {
        List<BandoConvocatoria> teams = bandoRepository.findByConvocatoriaId(convocatoria.getId());
        if (teams.isEmpty()) {
            BandoConvocatoria teamA = BandoConvocatoria.builder()
                    .convocatoria(convocatoria).nombre("Equipo A").color("Azul").build();
            BandoConvocatoria teamB = BandoConvocatoria.builder()
                    .convocatoria(convocatoria).nombre("Equipo B").color("Rojo").build();
            teams = List.of(bandoRepository.save(teamA), bandoRepository.save(teamB));
        } else if (teams.size() == 1) {
            BandoConvocatoria teamB = BandoConvocatoria.builder()
                    .convocatoria(convocatoria).nombre("Equipo B").color("Rojo").build();
            teams = List.of(teams.get(0), bandoRepository.save(teamB));
        }
        BandoConvocatoria teamA = teams.get(0);
        BandoConvocatoria teamB = teams.get(1);

        List<Long> userIds = playersToMatch.stream()
                .map(a -> a.getUsuario() != null ? a.getUsuario().getId() : null)
                .filter(Objects::nonNull)
                .toList();

        List<UsuarioPosicion> allUserPositions = userIds.isEmpty() ? List.of() : usuarioPosicionRepository.findByUsuarioIdIn(userIds);
        Map<Long, List<UsuarioPosicion>> userPositionsMap = allUserPositions.stream()
                .collect(Collectors.groupingBy(up -> up.getUsuario().getId()));

        List<PosicionesDeporte> sportPositions = posicionesDeporteRepository.findByDeporteId(convocatoria.getDeporte().getId());

        Set<Asistencia> unassigned = new LinkedHashSet<>(playersToMatch);
        List<Pair> balancedPairs = new ArrayList<>();
        List<Asistencia> comodinesList = new ArrayList<>();

        if ("COMODIN".equals(convocatoria.getManejoExcedente()) && convocatoria.getCupoMaximo() != null && convocatoria.getCupoMaximo() > 0 && playersToMatch.size() > convocatoria.getCupoMaximo()) {
            int standardCount = convocatoria.getCupoMaximo();
            for (int i = standardCount; i < playersToMatch.size(); i++) {
                Asistencia comodinPlayer = playersToMatch.get(i);
                comodinesList.add(comodinPlayer);
                unassigned.remove(comodinPlayer);
            }
        }

        for (PosicionesDeporte pos : sportPositions) {
            List<Asistencia> prio1Players = new ArrayList<>();
            for (Asistencia a : unassigned) {
                if (a.getUsuario() != null) {
                    List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(a.getUsuario().getId(), List.of());
                    boolean isPrio1 = upList.stream().anyMatch(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 1);
                    if (isPrio1) prio1Players.add(a);
                }
            }
            while (prio1Players.size() >= 2) {
                Asistencia p1 = prio1Players.remove(0);
                Asistencia p2 = prio1Players.remove(0);
                unassigned.remove(p1); unassigned.remove(p2);
                balancedPairs.add(new Pair(p1, p2, pos, pos));
            }
        }

        for (PosicionesDeporte pos : sportPositions) {
            List<Asistencia> p1Leftovers = unassigned.stream()
                    .filter(a -> {
                        if (a.getUsuario() == null) return false;
                        List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(a.getUsuario().getId(), List.of());
                        return upList.stream().anyMatch(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 1);
                    }).collect(Collectors.toList());
            for (Asistencia p1 : p1Leftovers) {
                if (!unassigned.contains(p1)) continue;
                Asistencia partner = null; PosicionesDeporte partnerPos = null;
                for (Asistencia candidate : unassigned) {
                    if (candidate.equals(p1) || candidate.getUsuario() == null) continue;
                    List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(candidate.getUsuario().getId(), List.of());
                    Optional<UsuarioPosicion> p2Opt = upList.stream().filter(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 2).findFirst();
                    if (p2Opt.isPresent()) { partner = candidate; partnerPos = p2Opt.get().getPosicion(); break; }
                }
                if (partner == null) {
                    for (Asistencia candidate : unassigned) {
                        if (candidate.equals(p1) || candidate.getUsuario() == null) continue;
                        List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(candidate.getUsuario().getId(), List.of());
                        Optional<UsuarioPosicion> p3Opt = upList.stream().filter(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 3).findFirst();
                        if (p3Opt.isPresent()) { partner = candidate; partnerPos = p3Opt.get().getPosicion(); break; }
                    }
                }
                if (partner != null) { unassigned.remove(p1); unassigned.remove(partner); balancedPairs.add(new Pair(p1, partner, pos, partnerPos)); }
            }
        }

        List<Asistencia> leftoversList = new ArrayList<>(unassigned);
        while (leftoversList.size() >= 2) {
            Asistencia p1 = leftoversList.remove(0); Asistencia p2 = leftoversList.remove(0);
            unassigned.remove(p1); unassigned.remove(p2);
            balancedPairs.add(new Pair(p1, p2, getDefaultPosition(p1, sportPositions, userPositionsMap), getDefaultPosition(p2, sportPositions, userPositionsMap)));
        }

        int sizeA = 0, sizeB = 0;
        List<Asistencia> pairModified = new ArrayList<>();

        for (Pair pair : balancedPairs) {
            if (sizeA <= sizeB) {
                assignPlayer(pair.p1, pair.pos1, teamA); assignPlayer(pair.p2, pair.pos2, teamB);
            } else {
                assignPlayer(pair.p1, pair.pos1, teamB); assignPlayer(pair.p2, pair.pos2, teamA);
            }
            sizeA++; sizeB++;
            pairModified.add(pair.p1); pairModified.add(pair.p2);
        }

        if (!leftoversList.isEmpty()) {
            Asistencia last = leftoversList.remove(0);
            unassigned.remove(last);
            PosicionesDeporte posLast = getDefaultPosition(last, sportPositions, userPositionsMap);
            if ("COMODIN".equals(convocatoria.getManejoExcedente())) {
                comodinesList.add(last);
            } else {
                if (sizeA <= sizeB) assignPlayer(last, posLast, teamA); else assignPlayer(last, posLast, teamB);
                pairModified.add(last);
            }
        }

        for (Asistencia comodin : comodinesList) {
            comodin.setBando(null);
            PosicionesDeporte pos = getDefaultPosition(comodin, sportPositions, userPositionsMap);
            comodin.setPosicionAsignada(pos);
            pairModified.add(comodin);
        }

        if (!pairModified.isEmpty()) {
            asistenciaRepository.saveAll(pairModified);
        }

        return asistenciaRepository.findByConvocatoriaId(convocatoria.getId()).stream()
                .map(asistenciaMapper::toResponse)
                .toList();
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

    private static class Pair {
        final Asistencia p1; final Asistencia p2;
        final PosicionesDeporte pos1; final PosicionesDeporte pos2;
        Pair(Asistencia p1, Asistencia p2, PosicionesDeporte pos1, PosicionesDeporte pos2) {
            this.p1 = p1; this.p2 = p2; this.pos1 = pos1; this.pos2 = pos2;
        }
    }
}
