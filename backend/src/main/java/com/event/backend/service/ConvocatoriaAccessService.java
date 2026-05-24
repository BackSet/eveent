package com.event.backend.service;

import com.event.backend.exception.ForbiddenException;
import com.event.backend.model.Convocatoria;
import com.event.backend.model.Deporte;
import com.event.backend.model.EstadoConvocatoria;
import com.event.backend.model.TipoInvitacion;
import com.event.backend.repository.AsistenciaRepository;
import com.event.backend.repository.GrupoRepository;
import com.event.backend.repository.UsuarioPosicionRepository;
import com.event.backend.security.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConvocatoriaAccessService {

    private final SecurityService securityService;
    private final AsistenciaRepository asistenciaRepository;
    private final GrupoRepository grupoRepository;
    private final UsuarioPosicionRepository usuarioPosicionRepository;

    public boolean isOrganizer(Convocatoria convocatoria, Long userId) {
        if (userId == null) return false;
        if (securityService.isSuperAdmin()) return true;
        if (convocatoria.getCreadoPor() != null && convocatoria.getCreadoPor().getId().equals(userId)) {
            return true;
        }
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("gestionar_convocatorias")
                        || a.getAuthority().equals("editar_convocatorias")
                        || a.getAuthority().equals("crear_convocatorias"));
    }

    public boolean canView(Convocatoria convocatoria, Long userId) {
        if (convocatoria == null || userId == null) return false;
        if (isOrganizer(convocatoria, userId)) return true;

        if (convocatoria.getEstado() == EstadoConvocatoria.BORRADOR) {
            return false;
        }

        TipoInvitacion tipo = resolveTipo(convocatoria);

        return switch (tipo) {
            case ABIERTA -> true;
            case GRUPO -> isGroupMember(convocatoria, userId);
            case MANUAL -> hasInvitationRecord(convocatoria.getId(), userId);
        };
    }

    public boolean canSelfRegister(Convocatoria convocatoria, Long userId) {
        if (convocatoria == null || userId == null) return false;
        if (isOrganizer(convocatoria, userId)) return true;

        if (convocatoria.getEstado() != EstadoConvocatoria.ABIERTA
                && convocatoria.getEstado() != EstadoConvocatoria.EN_PROGRESO) {
            return false;
        }

        TipoInvitacion tipo = resolveTipo(convocatoria);

        return switch (tipo) {
            case ABIERTA -> canView(convocatoria, userId) && practicesSport(userId, convocatoria.getDeporte());
            case GRUPO -> isGroupMember(convocatoria, userId);
            case MANUAL -> hasInvitationRecord(convocatoria.getId(), userId);
        };
    }

    public void assertCanView(Convocatoria convocatoria, Long userId) {
        if (!canView(convocatoria, userId)) {
            throw new ForbiddenException(accessDeniedMessage(convocatoria));
        }
    }

    public void assertCanSelfRegister(Convocatoria convocatoria, Long userId) {
        if (!canSelfRegister(convocatoria, userId)) {
            TipoInvitacion tipo = resolveTipo(convocatoria);
            if (tipo == TipoInvitacion.ABIERTA && canView(convocatoria, userId)) {
                Deporte deporte = convocatoria.getDeporte();
                String deporteNombre = deporte != null ? deporte.getNombre() : "este deporte";
                throw new ForbiddenException(
                        "Solo los jugadores que practican " + deporteNombre
                                + " pueden inscribirse. Configura tus posiciones en tu perfil.");
            }
            throw new ForbiddenException(accessDeniedMessage(convocatoria));
        }
    }

    public String accessDeniedMessage(Convocatoria convocatoria) {
        return switch (resolveTipo(convocatoria)) {
            case ABIERTA -> "No tienes acceso a esta convocatoria.";
            case GRUPO -> "Esta convocatoria es solo para miembros del grupo seleccionado.";
            case MANUAL -> "Esta convocatoria es solo para jugadores invitados individualmente.";
        };
    }

    private TipoInvitacion resolveTipo(Convocatoria convocatoria) {
        return convocatoria.getTipoInvitacion() != null
                ? convocatoria.getTipoInvitacion()
                : TipoInvitacion.ABIERTA;
    }

    private boolean hasInvitationRecord(Long convocatoriaId, Long userId) {
        return asistenciaRepository.findByConvocatoriaIdAndUsuarioId(convocatoriaId, userId).isPresent();
    }

    private boolean isGroupMember(Convocatoria convocatoria, Long userId) {
        if (convocatoria.getGrupo() == null) {
            return false;
        }
        Long grupoId = convocatoria.getGrupo().getId();

        return grupoRepository.findById(grupoId)
                .map(grupo -> grupo.getMiembros().stream().anyMatch(m -> m.getId().equals(userId)))
                .orElse(false);
    }

    private boolean practicesSport(Long userId, Deporte deporte) {
        if (deporte == null) return true;
        return usuarioPosicionRepository.findByUsuarioId(userId).stream()
                .anyMatch(up -> up.getPosicion() != null
                        && up.getPosicion().getDeporte() != null
                        && up.getPosicion().getDeporte().getId().equals(deporte.getId()));
    }
}
