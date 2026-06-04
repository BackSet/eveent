package com.event.backend.service;

import com.event.backend.dto.bando.BandoRequest;
import com.event.backend.dto.bando.BandoResponse;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.BandoConvocatoria;
import com.event.backend.model.Convocatoria;
import com.event.backend.repository.BandoConvocatoriaRepository;
import com.event.backend.repository.ConvocatoriaGrupoEquipoRepository;
import com.event.backend.repository.ConvocatoriaRepository;
import com.event.backend.security.SecurityService;
import com.event.backend.util.ConvocatoriaScheduleHelper;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BandoService {

    private final BandoConvocatoriaRepository bandoRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final SecurityService securityService;
    private final ConvocatoriaAccessService convocatoriaAccessService;
    private final ConvocatoriaGrupoEquipoRepository convocatoriaGrupoEquipoRepository;

    @Transactional(readOnly = true)
    public List<BandoResponse> findByConvocatoriaId(Long convocatoriaId) {
        return bandoRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BandoResponse findById(Long id) {
        return bandoRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + id));
    }

    public BandoResponse create(Long convocatoriaId, BandoRequest request) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new NotFoundException("Convocatoria no encontrada con id: " + convocatoriaId));

        assertCanManageLineup(convocatoria);
        ConvocatoriaScheduleHelper.assertConvocatoriaMatchmakingAllowed(convocatoria, LocalDateTime.now());

        BandoConvocatoria bando = BandoConvocatoria.builder()
                .convocatoria(convocatoria)
                .nombre(request.getNombre())
                .color(request.getColor())
                .build();
        bando = bandoRepository.save(bando);
        return toResponse(bando);
    }

    public BandoResponse update(Long id, BandoRequest request) {
        BandoConvocatoria bando = bandoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + id));

        assertCanManageLineup(bando.getConvocatoria());
        ConvocatoriaScheduleHelper.assertConvocatoriaMatchmakingAllowed(
                bando.getConvocatoria(), LocalDateTime.now());

        if (request.getNombre() != null) bando.setNombre(request.getNombre());
        if (request.getColor() != null) bando.setColor(request.getColor());

        bando = bandoRepository.save(bando);
        return toResponse(bando);
    }

    public void delete(Long id) {
        BandoConvocatoria bando = bandoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Bando no encontrado con id: " + id));

        assertCanManageLineup(bando.getConvocatoria());
        ConvocatoriaScheduleHelper.assertConvocatoriaMatchmakingAllowed(
                bando.getConvocatoria(), LocalDateTime.now());
        if (convocatoriaGrupoEquipoRepository.existsByEquipoId(id)) {
            throw new com.event.backend.exception.BusinessException(
                    "Este bando pertenece a una convocatoria por grupos y no se puede eliminar manualmente.");
        }

        bandoRepository.delete(bando);
    }

    private void assertCanManageLineup(Convocatoria convocatoria) {
        Long currentUserId = securityService.getCurrentUserId();
        if (!convocatoriaAccessService.canManageAttendance(convocatoria, currentUserId)) {
            throw new com.event.backend.exception.ForbiddenException(
                    "No tienes permiso para gestionar los bandos de esta convocatoria.");
        }
    }

    private BandoResponse toResponse(BandoConvocatoria bando) {
        return BandoResponse.builder()
                .id(bando.getId())
                .nombre(bando.getNombre())
                .color(bando.getColor())
                .convocatoriaId(bando.getConvocatoria().getId())
                .build();
    }
}
