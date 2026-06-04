package com.event.backend.service;

import com.event.backend.dto.convocatoria.ConvocatoriaGrupoEquipoResponse;
import com.event.backend.exception.BusinessException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.BandoConvocatoria;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.ConvocatoriaGrupoEquipo;
import com.event.backend.model.Grupo;
import com.event.backend.repository.BandoConvocatoriaRepository;
import com.event.backend.repository.ConvocatoriaGrupoEquipoRepository;
import com.event.backend.repository.GrupoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaGrupoEquipoService {

    private final ConvocatoriaGrupoEquipoRepository repository;
    private final GrupoRepository grupoRepository;
    private final BandoConvocatoriaRepository bandoRepository;

    public List<ConvocatoriaGrupoEquipo> syncForConvocatoria(
            Convocatoria convocatoria,
            List<Long> grupoIds,
            Integer cupoTitularesPorGrupo,
            Integer cupoEsperaPorGrupo
    ) {
        List<Long> normalizedGrupoIds = normalizeGrupoIds(grupoIds);
        validateMinGroups(normalizedGrupoIds);

        clearForConvocatoria(convocatoria.getId());

        int cupoTitulares = resolveCupoTitulares(convocatoria, cupoTitularesPorGrupo);
        List<ConvocatoriaGrupoEquipo> relaciones = new ArrayList<>();
        for (int i = 0; i < normalizedGrupoIds.size(); i++) {
            Long grupoId = normalizedGrupoIds.get(i);
            Grupo grupo = grupoRepository.findById(grupoId)
                    .orElseThrow(() -> new NotFoundException("Grupo no encontrado con id: " + grupoId));
            String nombreEquipo = grupo.getNombre();
            BandoConvocatoria equipo = bandoRepository.save(BandoConvocatoria.builder()
                    .convocatoria(convocatoria)
                    .nombre(nombreEquipo)
                    .build());

            relaciones.add(repository.save(ConvocatoriaGrupoEquipo.builder()
                    .convocatoria(convocatoria)
                    .grupo(grupo)
                    .equipo(equipo)
                    .nombreEquipo(nombreEquipo)
                    .cupoTitulares(cupoTitulares)
                    .cupoEspera(cupoEsperaPorGrupo)
                    .orden(i)
                    .build()));
        }
        return relaciones;
    }

    public void assertHasEnoughGroups(Long convocatoriaId) {
        if (repository.countByConvocatoriaId(convocatoriaId) < 2) {
            throw new BusinessException("Una convocatoria por grupos debe tener minimo 2 grupos participantes.");
        }
    }

    public void clearForConvocatoria(Long convocatoriaId) {
        List<ConvocatoriaGrupoEquipo> relaciones = repository.findByConvocatoriaIdOrderByOrdenAsc(convocatoriaId);
        if (relaciones.isEmpty()) {
            return;
        }
        List<BandoConvocatoria> equipos = relaciones.stream()
                .map(ConvocatoriaGrupoEquipo::getEquipo)
                .toList();
        repository.deleteAll(relaciones);
        repository.flush();
        bandoRepository.deleteAll(equipos);
    }

    @Transactional(readOnly = true)
    public List<ConvocatoriaGrupoEquipoResponse> findResponsesByConvocatoriaId(Long convocatoriaId) {
        return repository.findByConvocatoriaIdOrderByOrdenAsc(convocatoriaId).stream()
                .map(this::toResponse)
                .toList();
    }

    private List<Long> normalizeGrupoIds(List<Long> grupoIds) {
        if (grupoIds == null) {
            return List.of();
        }
        Set<Long> unique = new LinkedHashSet<>();
        for (Long grupoId : grupoIds) {
            if (grupoId == null) {
                continue;
            }
            if (!unique.add(grupoId)) {
                throw new BusinessException("Un grupo no puede repetirse en la misma convocatoria.");
            }
        }
        return new ArrayList<>(unique);
    }

    private void validateMinGroups(List<Long> grupoIds) {
        if (grupoIds.size() < 2) {
            throw new BusinessException("Una convocatoria por grupos debe tener minimo 2 grupos participantes.");
        }
    }

    private int resolveCupoTitulares(Convocatoria convocatoria, Integer requested) {
        if (requested != null && requested > 0) {
            return requested;
        }
        if (convocatoria.getDeporte() != null
                && convocatoria.getDeporte().getMaxJugadoresPorBando() != null
                && convocatoria.getDeporte().getMaxJugadoresPorBando() > 0) {
            return convocatoria.getDeporte().getMaxJugadoresPorBando();
        }
        if (convocatoria.getCupoMaximo() != null && convocatoria.getCupoMaximo() > 0) {
            return convocatoria.getCupoMaximo();
        }
        return 1;
    }

    private ConvocatoriaGrupoEquipoResponse toResponse(ConvocatoriaGrupoEquipo relacion) {
        return ConvocatoriaGrupoEquipoResponse.builder()
                .id(relacion.getId())
                .convocatoriaId(relacion.getConvocatoria().getId())
                .grupoId(relacion.getGrupo().getId())
                .grupoNombre(relacion.getGrupo().getNombre())
                .equipoId(relacion.getEquipo().getId())
                .nombreEquipo(relacion.getNombreEquipo())
                .cupoTitulares(relacion.getCupoTitulares())
                .cupoEspera(relacion.getCupoEspera())
                .orden(relacion.getOrden())
                .build();
    }
}
