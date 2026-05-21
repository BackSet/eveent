package com.event.backend.config;

import com.event.backend.model.*;
import com.event.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RecurrenciaScheduler {

    private final ConvocatoriaRecurrenteRepository recurrenciaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final AsistenciaRepository asistenciaRepository;

    @Scheduled(fixedRate = 300000)
    public void runScheduler() {
        log.debug("Planificador ejecutándose...");
        generarInstanciasProximas();
        cerrarConvocatoriasVencidas();
    }

    public void generarInstanciasProximas() {
        List<ConvocatoriaRecurrente> activas = recurrenciaRepository.findByActivoTrue();
        if (activas.isEmpty()) return;
        log.info("Generando instancias para {} reglas activas...", activas.size());

        LocalDate today = LocalDate.now();

        for (ConvocatoriaRecurrente rule : activas) {
            try {
                LocalDate targetDate = today;
                boolean shouldGenerate = false;

                if ("DIARIO".equalsIgnoreCase(rule.getPatron())) {
                    shouldGenerate = true;
                } else if ("SEMANAL".equalsIgnoreCase(rule.getPatron())) {
                    String dayOfWeekName = targetDate.getDayOfWeek().name();
                    if (rule.getDiasSemana() != null && rule.getDiasSemana().toUpperCase().contains(dayOfWeekName)) {
                        shouldGenerate = true;
                    }
                }

                if (shouldGenerate) {
                    LocalDateTime eventTime = LocalDateTime.of(targetDate, rule.getHoraPartido());

                    if (!convocatoriaRepository.existsByRecurrenciaIdAndFechaHora(rule.getId(), eventTime)) {
                        log.info("Generando convocatoria: '{}' para fecha: {}", rule.getTitulo(), eventTime);

                        Convocatoria newConvocatoria = Convocatoria.builder()
                                .titulo(rule.getTitulo())
                                .descripcion(rule.getDescripcion())
                                .deporte(rule.getDeporte())
                                .fechaHora(eventTime)
                                .lugar(rule.getLugar())
                                .creadoPor(rule.getCreadoPor())
                                .estado(EstadoConvocatoria.ABIERTA)
                                .cupoMaximo(rule.getCupoMaximo())
                                .categoria(rule.getCategoria())
                                .recurrencia(rule)
                                .manejoExcedente("LISTA_ESPERA")
                                .fechaLimiteInscripcion(eventTime)
                                .build();

                        newConvocatoria = convocatoriaRepository.save(newConvocatoria);

                        if (rule.getGrupoDestino() != null) {
                            Grupo grupo = rule.getGrupoDestino();
                            if (grupo.getMiembros() != null) {
                                for (Usuario member : grupo.getMiembros()) {
                                    Asistencia asistencia = Asistencia.builder()
                                            .convocatoria(newConvocatoria)
                                            .usuario(member)
                                            .estado(EstadoAsistencia.PENDIENTE)
                                            .fechaRespuesta(LocalDateTime.now())
                                            .build();
                                    asistenciaRepository.save(asistencia);
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error procesando regla ID {}: {}", rule.getId(), e.getMessage(), e);
            }
        }
    }

    public void cerrarConvocatoriasVencidas() {
        List<Convocatoria> vencidas = convocatoriaRepository
                .findByEstadoAndFechaHoraBefore(EstadoConvocatoria.ABIERTA, LocalDateTime.now());
        for (Convocatoria c : vencidas) {
            c.setEstado(EstadoConvocatoria.CERRADA);
            convocatoriaRepository.save(c);
        }
        if (!vencidas.isEmpty()) {
            log.info("Cerradas {} convocatorias vencidas", vencidas.size());
        }
    }
}
