package com.event.backend.service;

import com.event.backend.dto.asistencia.AsistenciaResponse;
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
    private final EquiposConvocatoriaRepository equipoRepository;
    private final UsuarioPosicionRepository usuarioPosicionRepository;
    private final PosicionesDeporteRepository posicionesDeporteRepository;

    public List<AsistenciaResponse> runMatchmaking(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada con id: " + convocatoriaId));

        // 1. Fetch all ASISTIRE and LISTA_ESPERA attendances
        List<Asistencia> allAsistencias = asistenciaRepository.findByConvocatoriaId(convocatoriaId);
        
        List<Asistencia> confirmados = allAsistencias.stream()
                .filter(a -> a.getEstado() == EstadoAsistencia.ASISTIRE || a.getEstado() == EstadoAsistencia.LISTA_ESPERA)
                .sorted(Comparator.comparing(Asistencia::getFechaRespuesta))
                .collect(Collectors.toList());

        // 2. Apply RSVP Limit if cupoMaximo > 0
        List<Asistencia> playersToMatch = new ArrayList<>();
        if (convocatoria.getCupoMaximo() != null && convocatoria.getCupoMaximo() > 0 && confirmados.size() > convocatoria.getCupoMaximo()) {
            for (int i = 0; i < confirmados.size(); i++) {
                Asistencia a = confirmados.get(i);
                if (i < convocatoria.getCupoMaximo()) {
                    a.setEstado(EstadoAsistencia.ASISTIRE);
                    playersToMatch.add(a);
                } else {
                    if ("LISTA_ESPERA".equals(convocatoria.getManejoExcedente())) {
                        a.setEstado(EstadoAsistencia.LISTA_ESPERA);
                        a.setEquipo(null);
                    } else {
                        // COMODIN
                        a.setEstado(EstadoAsistencia.ASISTIRE);
                        playersToMatch.add(a);
                    }
                }
                asistenciaRepository.save(a);
            }
        } else {
            // Keep them as ASISTIRE
            for (Asistencia a : confirmados) {
                a.setEstado(EstadoAsistencia.ASISTIRE);
                playersToMatch.add(a);
                asistenciaRepository.save(a);
            }
        }

        if (playersToMatch.isEmpty()) {
            return List.of();
        }

        // 3. Ensure Team A and Team B exist
        List<EquiposConvocatoria> teams = equipoRepository.findByConvocatoriaId(convocatoriaId);
        if (teams.isEmpty()) {
            EquiposConvocatoria teamA = EquiposConvocatoria.builder()
                    .convocatoria(convocatoria)
                    .nombre("Equipo A")
                    .color("Azul")
                    .build();
            EquiposConvocatoria teamB = EquiposConvocatoria.builder()
                    .convocatoria(convocatoria)
                    .nombre("Equipo B")
                    .color("Rojo")
                    .build();
            teams = List.of(equipoRepository.save(teamA), equipoRepository.save(teamB));
        } else if (teams.size() == 1) {
            EquiposConvocatoria teamB = EquiposConvocatoria.builder()
                    .convocatoria(convocatoria)
                    .nombre("Equipo B")
                    .color("Rojo")
                    .build();
            teams = List.of(teams.get(0), equipoRepository.save(teamB));
        }
        EquiposConvocatoria teamA = teams.get(0);
        EquiposConvocatoria teamB = teams.get(1);

        // 4. Fetch position priorities for all users
        List<Long> userIds = playersToMatch.stream()
                .map(a -> a.getUsuario() != null ? a.getUsuario().getId() : null)
                .filter(Objects::nonNull)
                .toList();

        List<UsuarioPosicion> allUserPositions = userIds.isEmpty() ? List.of() : usuarioPosicionRepository.findByUsuarioIdIn(userIds);
        Map<Long, List<UsuarioPosicion>> userPositionsMap = allUserPositions.stream()
                .collect(Collectors.groupingBy(up -> up.getUsuario().getId()));

        List<PosicionesDeporte> sportPositions = posicionesDeporteRepository.findByDeporteId(convocatoria.getDeporte().getId());

        // We want to form balanced pairs
        Set<Asistencia> unassigned = new LinkedHashSet<>(playersToMatch);
        List<Pair> balancedPairs = new ArrayList<>();
        List<Asistencia> comodinesList = new ArrayList<>();

        // Check if there are players to handle as comodines directly (excedente as comodin)
        if ("COMODIN".equals(convocatoria.getManejoExcedente()) && convocatoria.getCupoMaximo() != null && convocatoria.getCupoMaximo() > 0 && playersToMatch.size() > convocatoria.getCupoMaximo()) {
            // The ones beyond standard cupo are comodines
            int standardCount = convocatoria.getCupoMaximo();
            for (int i = standardCount; i < playersToMatch.size(); i++) {
                Asistencia comodinPlayer = playersToMatch.get(i);
                comodinesList.add(comodinPlayer);
                unassigned.remove(comodinPlayer);
            }
        }

        // FASE 1: Exact Prio 1 Match
        for (PosicionesDeporte pos : sportPositions) {
            List<Asistencia> prio1Players = new ArrayList<>();
            for (Asistencia a : unassigned) {
                if (a.getUsuario() != null) {
                    List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(a.getUsuario().getId(), List.of());
                    boolean isPrio1 = upList.stream().anyMatch(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 1);
                    if (isPrio1) {
                        prio1Players.add(a);
                    }
                }
            }

            // Form pairs of Prio 1
            while (prio1Players.size() >= 2) {
                Asistencia p1 = prio1Players.remove(0);
                Asistencia p2 = prio1Players.remove(0);
                unassigned.remove(p1);
                unassigned.remove(p2);
                balancedPairs.add(new Pair(p1, p2, pos, pos));
            }
        }

        // FASE 2: Fallback to Prio 2 and Prio 3 for remaining line matching
        for (PosicionesDeporte pos : sportPositions) {
            // Find leftover players who have this position as Prio 1 but are unassigned
            List<Asistencia> p1Leftovers = unassigned.stream()
                    .filter(a -> {
                        if (a.getUsuario() == null) return false;
                        List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(a.getUsuario().getId(), List.of());
                        return upList.stream().anyMatch(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 1);
                    })
                    .collect(Collectors.toList());

            for (Asistencia p1 : p1Leftovers) {
                if (!unassigned.contains(p1)) continue;

                // Look for another unassigned player who has this position as Prio 2 or 3
                Asistencia partner = null;
                PosicionesDeporte partnerPos = null;
                for (Asistencia candidate : unassigned) {
                    if (candidate.equals(p1) || candidate.getUsuario() == null) continue;
                    List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(candidate.getUsuario().getId(), List.of());
                    
                    // Check Prio 2
                    Optional<UsuarioPosicion> p2Opt = upList.stream().filter(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 2).findFirst();
                    if (p2Opt.isPresent()) {
                        partner = candidate;
                        partnerPos = p2Opt.get().getPosicion();
                        break;
                    }
                }

                if (partner == null) {
                    // Check Prio 3
                    for (Asistencia candidate : unassigned) {
                        if (candidate.equals(p1) || candidate.getUsuario() == null) continue;
                        List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(candidate.getUsuario().getId(), List.of());
                        Optional<UsuarioPosicion> p3Opt = upList.stream().filter(up -> up.getPosicion().getId().equals(pos.getId()) && up.getPrioridad() == 3).findFirst();
                        if (p3Opt.isPresent()) {
                            partner = candidate;
                            partnerPos = p3Opt.get().getPosicion();
                            break;
                        }
                    }
                }

                if (partner != null) {
                    unassigned.remove(p1);
                    unassigned.remove(partner);
                    balancedPairs.add(new Pair(p1, partner, pos, partnerPos));
                }
            }
        }

        // FASE 3: Residual pairing of remaining unassigned players
        List<Asistencia> leftoversList = new ArrayList<>(unassigned);
        while (leftoversList.size() >= 2) {
            Asistencia p1 = leftoversList.remove(0);
            Asistencia p2 = leftoversList.remove(0);
            unassigned.remove(p1);
            unassigned.remove(p2);

            // Assign default/first available positions
            PosicionesDeporte pos1 = getDefaultPositionForUser(p1, sportPositions, userPositionsMap);
            PosicionesDeporte pos2 = getDefaultPositionForUser(p2, sportPositions, userPositionsMap);
            balancedPairs.add(new Pair(p1, p2, pos1, pos2));
        }

        // FASE 4: Equitative division of pairs between Team A and Team B
        int sizeA = 0;
        int sizeB = 0;

        for (Pair pair : balancedPairs) {
            // Alternate assignment to balance teams
            if (sizeA <= sizeB) {
                assignPlayer(pair.p1, pair.pos1, teamA);
                assignPlayer(pair.p2, pair.pos2, teamB);
                sizeA++;
                sizeB++;
            } else {
                assignPlayer(pair.p1, pair.pos1, teamB);
                assignPlayer(pair.p2, pair.pos2, teamA);
                sizeA++;
                sizeB++;
            }
        }

        // Handle the absolute leftover if there is one odd player left
        if (!leftoversList.isEmpty()) {
            Asistencia last = leftoversList.remove(0);
            unassigned.remove(last);
            PosicionesDeporte posLast = getDefaultPositionForUser(last, sportPositions, userPositionsMap);

            if ("COMODIN".equals(convocatoria.getManejoExcedente())) {
                comodinesList.add(last);
            } else {
                if (sizeA <= sizeB) {
                    assignPlayer(last, posLast, teamA);
                } else {
                    assignPlayer(last, posLast, teamB);
                }
            }
        }

        // Handle comodines (no team assignment)
        for (Asistencia comodin : comodinesList) {
            comodin.setEquipo(null);
            PosicionesDeporte pos = getDefaultPositionForUser(comodin, sportPositions, userPositionsMap);
            comodin.setPosicion(pos);
            asistenciaRepository.save(comodin);
        }

        // Reload and return all attendances
        return asistenciaRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(this::toResponse)
                .toList();
    }

    private PosicionesDeporte getDefaultPositionForUser(Asistencia a, List<PosicionesDeporte> sportPositions, Map<Long, List<UsuarioPosicion>> userPositionsMap) {
        if (a.getPosicion() != null) return a.getPosicion();
        if (a.getUsuario() != null) {
            List<UsuarioPosicion> upList = userPositionsMap.getOrDefault(a.getUsuario().getId(), List.of());
            if (!upList.isEmpty()) {
                upList.sort(Comparator.comparing(UsuarioPosicion::getPrioridad));
                return upList.get(0).getPosicion();
            }
        }
        return sportPositions.isEmpty() ? null : sportPositions.get(0);
    }

    private void assignPlayer(Asistencia player, PosicionesDeporte position, EquiposConvocatoria team) {
        player.setEquipo(team);
        player.setPosicion(position);
        asistenciaRepository.save(player);
    }

    private AsistenciaResponse toResponse(Asistencia asistencia) {
        return AsistenciaResponse.builder()
                .id(asistencia.getId())
                .convocatoriaId(asistencia.getConvocatoria().getId())
                .convocatoriaTitulo(asistencia.getConvocatoria().getTitulo())
                .usuarioId(asistencia.getUsuario() != null ? asistencia.getUsuario().getId() : null)
                .usuarioNombre(asistencia.getUsuario() != null ? asistencia.getUsuario().getNombre() : null)
                .nombreExterno(asistencia.getNombreExterno())
                .invitadoPorId(asistencia.getInvitadoPor() != null ? asistencia.getInvitadoPor().getId() : null)
                .invitadoPorNombre(asistencia.getInvitadoPor() != null ? asistencia.getInvitadoPor().getNombre() : null)
                .estado(asistencia.getEstado())
                .posicionId(asistencia.getPosicion() != null ? asistencia.getPosicion().getId() : null)
                .posicionNombre(asistencia.getPosicion() != null ? asistencia.getPosicion().getNombre() : null)
                .equipoId(asistencia.getEquipo() != null ? asistencia.getEquipo().getId() : null)
                .equipoNombre(asistencia.getEquipo() != null ? asistencia.getEquipo().getNombre() : null)
                .numeroCamiseta(asistencia.getUsuario() != null ? asistencia.getUsuario().getNumeroCamiseta() : null)
                .fechaRespuesta(asistencia.getFechaRespuesta())
                .build();
    }

    private static class Pair {
        final Asistencia p1;
        final Asistencia p2;
        final PosicionesDeporte pos1;
        final PosicionesDeporte pos2;

        Pair(Asistencia p1, Asistencia p2, PosicionesDeporte pos1, PosicionesDeporte pos2) {
            this.p1 = p1;
            this.p2 = p2;
            this.pos1 = pos1;
            this.pos2 = pos2;
        }
    }
}
