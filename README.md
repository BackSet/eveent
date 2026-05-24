# Event

Sistema web para **gestionar convocatorias deportivas**: publicar partidos, confirmar asistencias (RSVP), formar bandos, administrar grupos de jugadores y configurar disciplinas con sus posiciones. Incluye control de acceso por **roles y permisos (RBAC)**.

Repositorio: [github.com/BackSet/eveent](https://github.com/BackSet/eveent)

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| **Convocatorias** | Creación, edición, publicación, cancelación y detalle de eventos. Estados: borrador, abierta, en progreso, cerrada, cancelada. |
| **Asistencias (RSVP)** | Confirmación o rechazo de asistencia, lista de espera según cupo, gestión por organizadores. |
| **Bandos y alineación** | Creación de equipos, asignación manual o balanceo automático según posiciones preferidas. |
| **Convocatorias recurrentes** | Reglas RRULE con horarios por día; generación programada de instancias. |
| **Grupos** | Agrupación de jugadores para convocatorias restringidas por grupo. |
| **Deportes y posiciones** | Catálogo de disciplinas (reglas por equipos, cupos por bando) y posiciones oficiales. |
| **Perfil de jugador** | Datos personales, contraseña y prioridades de posición por deporte. |
| **Usuarios** | Alta, edición, baja y suspensión temporal de jugadores. |
| **Roles y permisos** | Roles predefinidos (SuperAdmin, Organizador, Jugador) y catálogo extensible de permisos. |

### Roles del sistema

| Rol | Alcance típico |
|-----|----------------|
| **SuperAdmin** | Acceso completo: usuarios, roles, permisos, deportes, grupos y convocatorias. |
| **Organizador** | Gestión operativa: convocatorias, grupos, deportes, suspensión de jugadores. |
| **Jugador** | Ver convocatorias y grupos, responder asistencia e invitar externos (según configuración). |

Los permisos canónicos viven en `PermisosCatalog.java` (backend). La pantalla de permisos solo permite editar el **nombre visible**; las claves se definen en código y migraciones SQL.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, Radix UI, Lucide |
| **Backend** | Spring Boot 4, Spring Security, JPA/Hibernate, JWT |
| **Base de datos** | PostgreSQL |
| **Migraciones** | Scripts SQL en `backend/src/main/resources/db/migration/` (Flyway deshabilitado; esquema también evoluciona con `ddl-auto=update` en desarrollo) |

---

## Estructura del repositorio

```
event/
├── backend/          # API REST (Spring Boot)
│   └── src/main/java/com/event/backend/
│       ├── controller/   # Endpoints HTTP
│       ├── service/      # Lógica de negocio
│       ├── model/        # Entidades JPA
│       ├── config/       # Seguridad, permisos, inicialización
│       └── util/         # Reglas de convocatoria (fechas, eliminación, etc.)
├── frontend/         # SPA (React + Vite)
│   └── src/
├── Dockerfile        # Build producción (front + back)
├── railway.toml
│       ├── pages/        # Pantallas por ruta
│       ├── components/   # UI reutilizable, lineup, convocatoria
│       ├── hooks/        # Auth, API, capacidades por convocatoria
│       └── lib/          # Permisos, fechas, iconografía, validaciones
├── docker-compose.prod.yml
├── railway.env.example
└── README.md
```

---

## Requisitos previos

- **Java 25** (según `pom.xml` del backend)
- **Maven 3.9+**
- **Node.js 20+** y npm
- **PostgreSQL 14+** con una base de datos creada (por defecto `event`)

---

## Configuración local

### 1. Base de datos

Crea la base en PostgreSQL:

```sql
CREATE DATABASE event;
```

### 2. Variables de entorno

Plantillas sin secretos (cópialas y renómbralas):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### Backend

Completa `backend/.env` (o exporta las variables en tu shell). El perfil activo por defecto es `dev` (`application-dev.properties`).

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_URL` | JDBC PostgreSQL | `jdbc:postgresql://localhost:5432/event` |
| `DB_USERNAME` | Usuario BD | `postgres` |
| `DB_PASSWORD` | Contraseña BD | *(tu contraseña)* |
| `JWT_SECRET` | Secreto para firmar tokens (mín. 32 caracteres) | *(cadena larga aleatoria)* |
| `JWT_EXPIRATION` | Duración del token en ms | `86400000` |
| `SERVER_PORT` | Puerto del API | `8080` |
| `CORS_ALLOWED_ORIGINS` | Orígenes del frontend | `http://localhost:5173` |
| `ADMIN_BOOTSTRAP_ENABLED` | Crear admin al arrancar | `true` |
| `ADMIN_USERNAME` | Usuario admin inicial | `admin` |
| `ADMIN_EMAIL` | Email admin | `admin@event.com` |
| `ADMIN_INITIAL_PASSWORD` | Contraseña inicial | *(cámbiala en producción)* |
| `ADMIN_NOMBRE` | Nombre visible | `Super Admin` |

#### Frontend

Completa `frontend/.env` a partir de `frontend/.env.example`. Solo las variables con prefijo `VITE_` están disponibles en el cliente.

### 4. Arranque

**Backend** (desde `backend/`):

```bash
mvn spring-boot:run
```

API en `http://localhost:8080`.

**Frontend** (desde `frontend/`):

```bash
npm install
npm run dev
```

Interfaz en `http://localhost:5173` (puerto por defecto de Vite).

### 5. Primer acceso

Con `ADMIN_BOOTSTRAP_ENABLED=true`, al iniciar el backend se sincronizan permisos/roles y se crea el usuario administrador si no existe. Inicia sesión en `/login` con las credenciales configuradas.

---

## Scripts útiles

### Frontend

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (`tsc` + `vite build`) |
| `npm run preview` | Vista previa del build |

### Backend

| Comando | Acción |
|---------|--------|
| `mvn spring-boot:run` | Ejecutar en desarrollo |
| `mvn compile` | Compilar |
| `mvn test` | Tests |

---

## API y autenticación

- Las rutas protegidas exigen cabecera `Authorization: Bearer <JWT>`.
- El frontend guarda el token y lo envía mediante el cliente en `frontend/src/services/api.ts`.
- Ante `401`, redirige automáticamente a `/login`.

Documentación de endpoints: controladores en `backend/src/main/java/com/event/backend/controller/`.

---

## Convocatorias: reglas de negocio (resumen)

- Solo convocatorias en estado **ABIERTA** admiten nuevas confirmaciones de asistencia (salvo gestión explícita del organizador).
- La **cancelación** aplica a convocatorias abiertas; otras transiciones dependen del estado y permisos.
- La **eliminación** valida integridad (asistencias, bandos, etc.) según `ConvocatoriaScheduleHelper`.
- **Tipo de invitación**: pública, por grupo o restringida; el acceso se valida en `ConvocatoriaAccessService`.
- **Recurrencia**: el planificador (`RecurrenciaScheduler`) materializa instancias según la regla configurada.

---

## Interfaz de usuario

- Diseño tipo **Notion** (covers, listas densas, callouts).
- **Skeletons** en cargas iniciales; spinners solo en acciones de botón.
- **Iconografía** centralizada en `frontend/src/lib/iconography.tsx` (Lucide).
- Tema claro / oscuro / sistema desde la barra superior.

---

## Seguridad

- No subas archivos `.env` al repositorio (están en `.gitignore`).
- En producción: desactiva `ADMIN_BOOTSTRAP_ENABLED` tras el primer arranque y usa `JWT_SECRET` fuerte (Base64). Con el despliegue unificado, `CORS_ALLOWED_ORIGINS` solo hace falta si consumes la API desde otro dominio.

---

## Despliegue en Railway

### Por qué un solo servicio (y no Nginx aparte)

Para esta app (SPA + API REST en el mismo dominio), el enfoque recomendado es **un contenedor Spring Boot** que:

1. Compila el frontend con Vite en el build de Docker.
2. Embebe `dist/` en `classpath:/static/` dentro del JAR.
3. Sirve la SPA y expone `/api/**` en el **mismo puerto y dominio**.

| Enfoque | Ventajas | Inconvenientes |
|---------|----------|----------------|
| **Unificado (actual)** | Un servicio Railway, sin proxy Nginx, sin `BACKEND_URL`, sin CORS entre front y API, React Router con fallback en Spring | Imagen Docker algo más grande |
| Nginx + API separados | Escala front y API por separado | Dos servicios, proxy, CORS, más variables y coste |

Nginx sigue siendo excelente como CDN o reverse proxy de alto tráfico; para Railway y este tamaño de proyecto, **Spring + static embebido** es más simple y robusto.

### Arquitectura

```
Usuario → [Spring Boot :PORT]
              ├── /api/*     → controladores REST + JWT
              ├── /assets/*  → ficheros Vite
              └── /*         → index.html (React Router)
              └── JDBC → [PostgreSQL]
```

### Archivos de despliegue

| Archivo | Uso |
|---------|-----|
| `Dockerfile` (raíz) | Multi-stage: Node (Vite) + Maven (JAR con static) + JRE |
| `railway.toml` (raíz) | Build Docker y healthcheck |
| `backend/.../application-prod.properties` | Perfil `prod` |
| `backend/.../SpaWebConfig.java` | Fallback SPA → `index.html` |
| `railway.env.example` | Variables del panel Railway |
| `docker-compose.prod.yml` | Prueba local (`app` + `db`) |

### Pasos en Railway

1. **Nuevo proyecto** → conectar el repositorio.
2. **Añadir PostgreSQL** y vincularlo al servicio de la app.
3. **Un servicio** desde la **raíz del repo** (Root Directory vacío o `/`).
   - Railway usará `Dockerfile` y `railway.toml` de la raíz.
4. Variables (ver `railway.env.example`):
   - `SPRING_PROFILES_ACTIVE=prod`
   - `JWT_SECRET` (`openssl rand -base64 48`)
   - `ADMIN_BOOTSTRAP_ENABLED=true` solo en el primer despliegue
5. Generar dominio público → esa URL sirve **login, dashboard y API**.

### Perfil de producción

- `spring.jpa.hibernate.ddl-auto=validate` + **Flyway**
- Puerto: `PORT` (Railway)
- Health: `GET /actuator/health`
- `VITE_API_URL` vacío en build → peticiones a `/api/...` en el mismo host

### Prueba local con Docker

```bash
docker compose -f docker-compose.prod.yml up --build
```

App: http://localhost:8080 (UI y API en el mismo puerto).

---

## Licencia

Proyecto privado. Consulta al mantenedor del repositorio para condiciones de uso.
