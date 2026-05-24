package com.event.backend.config;

import com.event.backend.model.*;
import com.event.backend.repository.*;
import com.event.backend.service.AutoAceptacionService;
import com.event.backend.util.ConvocatoriaScheduleHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RecurrenciaScheduler {

    private final ConfiguracionRecurrenteRepository configuracionRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final AutoAceptacionService autoAceptacionService;

    @Scheduled(fixedRate = 60000)
    public void runScheduler() {
        runLifecycleTriggers();
        cancelExpiredDrafts();
        generarInstanciasProximas();
    }

    public void runLifecycleTriggers() {
        LocalDateTime now = LocalDateTime.now();

        List<Convocatoria> abiertas = convocatoriaRepository.findByEstado(EstadoConvocatoria.ABIERTA);
        for (Convocatoria c : abiertas) {
            if (c.getFechaHora() != null && !c.getFechaHora().isAfter(now)) {
                c.setEstado(EstadoConvocatoria.EN_PROGRESO);
                convocatoriaRepository.save(c);
                log.info("Convocatoria {} → EN_PROGRESO (evento inicio)", c.getId());
            }
        }

        List<Convocatoria> inProgress = convocatoriaRepository.findByEstado(EstadoConvocatoria.EN_PROGRESO);
        for (Convocatoria c : inProgress) {
            LocalDateTime endTime = c.getFechaHoraFin();
            if (endTime == null && c.getDuracionEstimadaMinutos() != null && c.getFechaHora() != null) {
                endTime = c.getFechaHora().plusMinutes(c.getDuracionEstimadaMinutos());
            }
            if (endTime != null && !endTime.isAfter(now)) {
                c.setEstado(EstadoConvocatoria.FINALIZADA);
                convocatoriaRepository.save(c);
                log.info("Convocatoria {} → FINALIZADA", c.getId());
            }
        }
    }

    public void cancelExpiredDrafts() {
        LocalDateTime now = LocalDateTime.now();
        List<Convocatoria> borradores = convocatoriaRepository.findByEstado(EstadoConvocatoria.BORRADOR);
        for (Convocatoria c : borradores) {
            if (c.getFechaHora() != null
                    && ConvocatoriaScheduleHelper.shouldAutoCancelExpiredDraft(c.getFechaHora(), now)) {
                c.setEstado(EstadoConvocatoria.CANCELADA);
                convocatoriaRepository.save(c);
                log.info(
                        "Convocatoria {} → CANCELADA (borrador vencido, evento {})",
                        c.getId(),
                        c.getFechaHora());
            }
        }
    }

    public void generarInstanciasProximas() {
        List<ConfiguracionRecurrente> activas = configuracionRepository.findByActivoTrue();
        if (activas.isEmpty()) return;

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        for (ConfiguracionRecurrente rule : activas) {
            try {
                if (!shouldGenerateToday(rule, today)) continue;

                String dayKey = getDayKey(today);
                Map<String, HorarioDia> horarios = rule.getHorariosPorDia();
                HorarioDia horario = horarios != null ? horarios.get(dayKey) : null;

                if (horario == null && horarios != null) {
                    horario = horarios.get("DEFAULT");
                }

                LocalTime horaEvento = horario != null && horario.getHoraEvento() != null
                        ? LocalTime.parse(horario.getHoraEvento())
                        : LocalTime.of(20, 0);
                int duracion = horario != null && horario.getDuracionMinutos() != null
                        ? horario.getDuracionMinutos() : 60;

                LocalDateTime eventTime = LocalDateTime.of(today, horaEvento);

                if (ConvocatoriaScheduleHelper.isEventScheduleInPast(eventTime, now)) {
                    log.debug(
                            "Omitiendo instancia recurrente '{}' — hora del evento {} ya pasó",
                            rule.getTitulo(),
                            eventTime);
                    continue;
                }

                if (convocatoriaRepository.existsByConfiguracionRecurrenteIdAndFechaHora(rule.getId(), eventTime)) continue;

                log.info("Generando convocatoria: '{}' para fecha: {}", rule.getTitulo(), eventTime);

                boolean hasGrupoDestino = rule.getGrupoDestino() != null;
                Convocatoria newConv = Convocatoria.builder()
                        .titulo(rule.getTitulo())
                        .descripcion(rule.getDescripcion())
                        .deporte(rule.getDeporte())
                        .fechaHora(eventTime)
                        .fechaHoraFin(eventTime.plusMinutes(duracion))
                        .duracionEstimadaMinutos(duracion)
                        .lugar(rule.getLugar())
                        .creadoPor(rule.getCreadoPor())
                        .estado(EstadoConvocatoria.BORRADOR)
                        .cupoMaximo(rule.getCupoMaximo())
                        .categoria(rule.getCategoria())
                        .configuracionRecurrente(rule)
                        .manejoExcedente("LISTA_ESPERA")
                        .tipoInvitacion(hasGrupoDestino ? com.event.backend.model.TipoInvitacion.GRUPO : com.event.backend.model.TipoInvitacion.ABIERTA)
                        .grupo(hasGrupoDestino ? rule.getGrupoDestino() : null)
                        .build();

                if (horario != null && horario.getHoraApertura() != null) {
                    LocalTime horaApertura = LocalTime.parse(horario.getHoraApertura());
                    newConv.setFechaAperturaInscripcion(LocalDateTime.of(today, horaApertura));
                }

                if (newConv.getFechaAperturaInscripcion() == null && newConv.getEstado() == EstadoConvocatoria.ABIERTA) {
                    newConv.setFechaAperturaInscripcion(LocalDateTime.now());
                }

                newConv = convocatoriaRepository.save(newConv);

                if (rule.getGrupoDestino() != null) {
                    Grupo grupo = rule.getGrupoDestino();
                    if (grupo.getMiembros() != null) {
                        final Convocatoria savedConv = newConv;
                        List<Asistencia> bulkAsistencias = grupo.getMiembros().stream()
                                .map(member -> {
                                    Asistencia asistencia = Asistencia.builder()
                                            .convocatoria(savedConv)
                                            .usuario(member)
                                            .estado(EstadoAsistencia.PENDIENTE)
                                            .fechaRespuesta(LocalDateTime.now())
                                            .build();
                                    autoAceptacionService.enrichAsistenciaForAutoAccept(asistencia, member);
                                    return asistencia;
                                })
                                .toList();
                        asistenciaRepository.saveAll(bulkAsistencias);
                    }
                }
            } catch (Exception e) {
                log.error("Error procesando configuracion ID {}: {}", rule.getId(), e.getMessage(), e);
            }
        }
    }

    private boolean shouldGenerateToday(ConfiguracionRecurrente rule, LocalDate today) {
        String rrule = rule.getRruleExpression();
        if (rrule == null || rrule.isBlank()) return false;

        String upper = rrule.toUpperCase();

        if (upper.contains("FREQ=DAILY")) return true;

        if (upper.contains("FREQ=WEEKLY")) {
            String shortDay = getDayKey(today);
            return upper.contains(shortDay);
        }

        if (upper.contains("FREQ=MONTHLY")) return true;

        return false;
    }

    private String getDayKey(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case DayOfWeek.MONDAY -> "MO";
            case DayOfWeek.TUESDAY -> "TU";
            case DayOfWeek.WEDNESDAY -> "WE";
            case DayOfWeek.THURSDAY -> "TH";
            case DayOfWeek.FRIDAY -> "FR";
            case DayOfWeek.SATURDAY -> "SA";
            case DayOfWeek.SUNDAY -> "SU";
        };
    }
}