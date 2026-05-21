package com.event.backend.service;

import com.event.backend.dto.recurrencia.ConvocatoriaRecurrenteRequest;
import com.event.backend.dto.recurrencia.ConvocatoriaRecurrenteResponse;
import com.event.backend.model.ConvocatoriaRecurrente;
import com.event.backend.model.Deporte;
import com.event.backend.model.Grupo;
import com.event.backend.model.Usuario;
import com.event.backend.repository.ConvocatoriaRecurrenteRepository;
import com.event.backend.repository.DeporteRepository;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.repository.UsuarioRepository;
import com.event.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaRecurrenteService {

    private final ConvocatoriaRecurrenteRepository recurrenciaRepository;
    private final DeporteRepository deporteRepository;
    private final GrupoRepository grupoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<ConvocatoriaRecurrenteResponse> findAll() {
        return recurrenciaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConvocatoriaRecurrenteResponse findById(Long id) {
        return recurrenciaRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Regla de recurrencia no encontrada con id: " + id));
    }

    public ConvocatoriaRecurrenteResponse create(ConvocatoriaRecurrenteRequest request) {
        Usuario creador = getCurrentUser();
        Deporte deporte = deporteRepository.findById(request.getDeporteId())
                .orElseThrow(() -> new RuntimeException("Deporte no encontrado"));

        Grupo grupoDestino = null;
        if (request.getGrupoDestinoId() != null) {
            grupoDestino = grupoRepository.findById(request.getGrupoDestinoId())
                    .orElseThrow(() -> new RuntimeException("Grupo de destino no encontrado"));
        }

        ConvocatoriaRecurrente recurrencia = ConvocatoriaRecurrente.builder()
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .deporte(deporte)
                .lugar(request.getLugar())
                .creadoPor(creador)
                .cupoMaximo(request.getCupoMaximo() != null ? request.getCupoMaximo() : 0)
                .categoria(request.getCategoria())
                .patron(request.getPatron())
                .diasSemana(request.getDiasSemana())
                .horaEvento(LocalTime.parse(request.getHoraEvento()))
                .horaPartido(LocalTime.parse(request.getHoraPartido()))
                .grupoDestino(grupoDestino)
                .activo(request.getActivo() == null || request.getActivo())
                .build();

        recurrencia = recurrenciaRepository.save(recurrencia);
        return toResponse(recurrencia);
    }

    public ConvocatoriaRecurrenteResponse update(Long id, ConvocatoriaRecurrenteRequest request) {
        ConvocatoriaRecurrente recurrencia = recurrenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Regla no encontrada"));

        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getEmail().equals("admin@event.com");
        if (!recurrencia.getCreadoPor().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para editar esta regla de recurrencia");
        }

        if (request.getTitulo() != null) recurrencia.setTitulo(request.getTitulo());
        if (request.getDescripcion() != null) recurrencia.setDescripcion(request.getDescripcion());
        if (request.getLugar() != null) recurrencia.setLugar(request.getLugar());
        if (request.getCupoMaximo() != null) recurrencia.setCupoMaximo(request.getCupoMaximo());
        if (request.getCategoria() != null) recurrencia.setCategoria(request.getCategoria());
        if (request.getPatron() != null) recurrencia.setPatron(request.getPatron());
        if (request.getDiasSemana() != null) recurrencia.setDiasSemana(request.getDiasSemana());
        if (request.getHoraEvento() != null) recurrencia.setHoraEvento(LocalTime.parse(request.getHoraEvento()));
        if (request.getHoraPartido() != null) recurrencia.setHoraPartido(LocalTime.parse(request.getHoraPartido()));
        if (request.getActivo() != null) recurrencia.setActivo(request.getActivo());

        if (request.getDeporteId() != null && !request.getDeporteId().equals(recurrencia.getDeporte().getId())) {
            Deporte deporte = deporteRepository.findById(request.getDeporteId())
                    .orElseThrow(() -> new RuntimeException("Deporte no encontrado"));
            recurrencia.setDeporte(deporte);
        }

        if (request.getGrupoDestinoId() != null) {
            Grupo grupo = grupoRepository.findById(request.getGrupoDestinoId())
                    .orElseThrow(() -> new RuntimeException("Grupo no encontrado"));
            recurrencia.setGrupoDestino(grupo);
        } else if (request.getGrupoDestinoId() == null && recurrencia.getGrupoDestino() != null) {
            recurrencia.setGrupoDestino(null);
        }

        recurrencia = recurrenciaRepository.save(recurrencia);
        return toResponse(recurrencia);
    }

    public void delete(Long id) {
        ConvocatoriaRecurrente recurrencia = recurrenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Regla no encontrada"));

        Usuario currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getEmail().equals("admin@event.com");
        if (!recurrencia.getCreadoPor().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new RuntimeException("No tienes permiso para eliminar esta regla de recurrencia");
        }

        recurrenciaRepository.delete(recurrencia);
    }

    private Usuario getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return usuarioRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        }
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private ConvocatoriaRecurrenteResponse toResponse(ConvocatoriaRecurrente recurrencia) {
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        return ConvocatoriaRecurrenteResponse.builder()
                .id(recurrencia.getId())
                .titulo(recurrencia.getTitulo())
                .descripcion(recurrencia.getDescripcion())
                .deporteId(recurrencia.getDeporte().getId())
                .deporteNombre(recurrencia.getDeporte().getNombre())
                .lugar(recurrencia.getLugar())
                .cupoMaximo(recurrencia.getCupoMaximo())
                .categoria(recurrencia.getCategoria())
                .patron(recurrencia.getPatron())
                .diasSemana(recurrencia.getDiasSemana())
                .horaEvento(recurrencia.getHoraEvento() != null ? recurrencia.getHoraEvento().format(timeFormatter) : null)
                .horaPartido(recurrencia.getHoraPartido() != null ? recurrencia.getHoraPartido().format(timeFormatter) : null)
                .grupoDestinoId(recurrencia.getGrupoDestino() != null ? recurrencia.getGrupoDestino().getId() : null)
                .grupoDestinoNombre(recurrencia.getGrupoDestino() != null ? recurrencia.getGrupoDestino().getNombre() : null)
                .activo(recurrencia.getActivo())
                .fechaCreacion(recurrencia.getFechaCreacion())
                .build();
    }
}
