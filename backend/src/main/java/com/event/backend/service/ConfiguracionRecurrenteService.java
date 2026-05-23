package com.event.backend.service;

import com.event.backend.dto.configuracion_recurrente.ConfiguracionRecurrenteRequest;
import com.event.backend.dto.configuracion_recurrente.ConfiguracionRecurrenteResponse;
import com.event.backend.dto.configuracion_recurrente.ConfiguracionRecurrenteResponse.HorarioDiaResponse;
import com.event.backend.exception.ForbiddenException;
import com.event.backend.exception.NotFoundException;
import com.event.backend.model.ConfiguracionRecurrente;
import com.event.backend.model.Deporte;
import com.event.backend.model.Grupo;
import com.event.backend.model.HorarioDia;
import com.event.backend.model.Usuario;
import com.event.backend.repository.ConfiguracionRecurrenteRepository;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.security.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ConfiguracionRecurrenteService {

    private final ConfiguracionRecurrenteRepository configuracionRepository;
    private final DeporteRepository deporteRepository;
    private final GrupoRepository grupoRepository;
    private final SecurityService securityService;

    @Transactional(readOnly = true)
    public List<ConfiguracionRecurrenteResponse> findAll() {
        return configuracionRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConfiguracionRecurrenteResponse findById(Long id) {
        return configuracionRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Configuracion recurrente no encontrada con id: " + id));
    }

    public ConfiguracionRecurrenteResponse create(ConfiguracionRecurrenteRequest request) {
        Usuario creador = securityService.getCurrentUser();
        Deporte deporte = deporteRepository.findById(request.getDeporteId())
                .orElseThrow(() -> new NotFoundException("Deporte no encontrado"));

        Grupo grupoDestino = null;
        if (request.getGrupoDestinoId() != null) {
            grupoDestino = grupoRepository.findById(request.getGrupoDestinoId())
                    .orElseThrow(() -> new NotFoundException("Grupo de destino no encontrado"));
        }

        Map<String, HorarioDia> horarios = convertHorarios(request.getHorariosPorDia());

        ConfiguracionRecurrente config = ConfiguracionRecurrente.builder()
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .deporte(deporte)
                .lugar(request.getLugar())
                .creadoPor(creador)
                .cupoMaximo(request.getCupoMaximo() != null ? request.getCupoMaximo() : 0)
                .categoria(request.getCategoria())
                .rruleExpression(request.getRruleExpression())
                .horariosPorDia(horarios)
                .grupoDestino(grupoDestino)
                .activo(request.getActivo() == null || request.getActivo())
                .build();

        config = configuracionRepository.save(config);
        return toResponse(config);
    }

    public ConfiguracionRecurrenteResponse update(Long id, ConfiguracionRecurrenteRequest request) {
        ConfiguracionRecurrente config = configuracionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Configuracion no encontrada"));

        if (!securityService.isOwnerOrAdmin(config.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para editar esta configuracion");
        }

        if (request.getTitulo() != null) config.setTitulo(request.getTitulo());
        if (request.getDescripcion() != null) config.setDescripcion(request.getDescripcion());
        if (request.getLugar() != null) config.setLugar(request.getLugar());
        if (request.getCupoMaximo() != null) config.setCupoMaximo(request.getCupoMaximo());
        if (request.getCategoria() != null) config.setCategoria(request.getCategoria());
        if (request.getRruleExpression() != null) config.setRruleExpression(request.getRruleExpression());
        if (request.getHorariosPorDia() != null) config.setHorariosPorDia(convertHorarios(request.getHorariosPorDia()));
        if (request.getActivo() != null) config.setActivo(request.getActivo());

        if (request.getDeporteId() != null && (config.getDeporte() == null || !request.getDeporteId().equals(config.getDeporte().getId()))) {
            Deporte deporte = deporteRepository.findById(request.getDeporteId())
                    .orElseThrow(() -> new NotFoundException("Deporte no encontrado"));
            config.setDeporte(deporte);
        }

        if (request.getGrupoDestinoId() != null) {
            Grupo grupo = grupoRepository.findById(request.getGrupoDestinoId())
                    .orElseThrow(() -> new NotFoundException("Grupo no encontrado"));
            config.setGrupoDestino(grupo);
        } else if (request.getGrupoDestinoId() == null && config.getGrupoDestino() != null) {
            config.setGrupoDestino(null);
        }

        config = configuracionRepository.save(config);
        return toResponse(config);
    }

    public void delete(Long id) {
        ConfiguracionRecurrente config = configuracionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Configuracion no encontrada"));

        if (!securityService.isOwnerOrAdmin(config.getCreadoPor().getId())) {
            throw new ForbiddenException("No tienes permiso para eliminar esta configuracion");
        }

        configuracionRepository.delete(config);
    }

    private Map<String, HorarioDia> convertHorarios(Map<String, ConfiguracionRecurrenteRequest.HorarioDiaRequest> requestMap) {
        if (requestMap == null) return new HashMap<>();
        Map<String, HorarioDia> result = new HashMap<>();
        requestMap.forEach((key, value) -> {
            if (value != null) {
                if (value.getHoraApertura() != null && value.getHoraEvento() != null &&
                    value.getHoraApertura().compareTo(value.getHoraEvento()) >= 0) {
                    throw new com.event.backend.exception.BusinessException("La hora de apertura debe ser estrictamente anterior a la hora del evento para el día " + key + ".");
                }
                result.put(key, new HorarioDia(value.getHoraApertura(), value.getHoraEvento(), value.getDuracionMinutos()));
            }
        });
        return result;
    }

    private ConfiguracionRecurrenteResponse toResponse(ConfiguracionRecurrente config) {
        Map<String, HorarioDiaResponse> horariosResponse = new HashMap<>();
        if (config.getHorariosPorDia() != null) {
            config.getHorariosPorDia().forEach((key, value) -> {
                horariosResponse.put(key, HorarioDiaResponse.builder()
                        .horaApertura(value.getHoraApertura())
                        .horaEvento(value.getHoraEvento())
                        .duracionMinutos(value.getDuracionMinutos())
                        .build());
            });
        }

        return ConfiguracionRecurrenteResponse.builder()
                .id(config.getId())
                .titulo(config.getTitulo())
                .descripcion(config.getDescripcion())
                .deporteId(config.getDeporte() != null ? config.getDeporte().getId() : null)
                .deporteNombre(config.getDeporte() != null ? config.getDeporte().getNombre() : "Sin deporte")
                .lugar(config.getLugar())
                .cupoMaximo(config.getCupoMaximo())
                .categoria(config.getCategoria())
                .rruleExpression(config.getRruleExpression())
                .horariosPorDia(horariosResponse)
                .grupoDestinoId(config.getGrupoDestino() != null ? config.getGrupoDestino().getId() : null)
                .grupoDestinoNombre(config.getGrupoDestino() != null ? config.getGrupoDestino().getNombre() : null)
                .activo(config.getActivo())
                .fechaCreacion(config.getFechaCreacion())
                .build();
    }
}