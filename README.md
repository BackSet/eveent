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
- En producción: desactiva `ADMIN_BOOTSTRAP_ENABLED` tras el primer arranque, usa `JWT_SECRET` fuerte (Base64) y configura `CORS_ALLOWED_ORIGINS` con la URL pública del frontend.

---

## Despliegue en Railway

### Arquitectura (backend + frontend separados)

```
Usuario → [Frontend Nginx :80]
              └── fetch → [Backend Spring Boot :PORT]
                              └── JDBC → [PostgreSQL]
```

| Servicio | Root Directory | Dominio | Variables clave |
|----------|----------------|---------|-----------------|
| PostgreSQL | (plugin) | interno | inyecta `DATABASE_URL` al backend |
| **backend** | `backend` | API pública | `DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `ADMIN_*` |
| **frontend** | `frontend` | App pública | `VITE_API_URL` (build-time) |

El frontend llama al API con `VITE_API_URL`; el backend permite el origen del front vía CORS.

### Archivos de despliegue

| Archivo | Uso |
|---------|-----|
| [`backend/Dockerfile`](backend/Dockerfile) | JAR Spring Boot |
| [`backend/railway.toml`](backend/railway.toml) | Healthcheck `/actuator/health` |
| [`backend/railway.env.example`](backend/railway.env.example) | Variables del servicio API |
| [`frontend/Dockerfile`](frontend/Dockerfile) | Build Vite + Nginx |
| [`frontend/nginx.conf.template`](frontend/nginx.conf.template) | Nginx + fallback SPA (`listen ${PORT}`) |
| [`frontend/railway.toml`](frontend/railway.toml) | Healthcheck `/` |
| [`frontend/railway.env.example`](frontend/railway.env.example) | `VITE_API_URL`, `VITE_SITE_URL`, SEO y Analytics |
| [`docker-compose.prod.yml`](docker-compose.prod.yml) | Prueba local (`db` + `backend` + `frontend`) |

### Pasos en Railway

1. **Nuevo proyecto** → conectar el repositorio.
2. **Añadir PostgreSQL** y vincularlo solo al servicio **backend**.
3. **Servicio backend**
   - Root Directory: `backend`
   - Railway usará `backend/Dockerfile` y `backend/railway.toml`
   - Variables: ver [`backend/railway.env.example`](backend/railway.env.example)
   - Generar dominio público → copiar URL (API)
4. **Servicio frontend**
   - Root Directory: `frontend`
   - Variables de **build**: ver [`frontend/railway.env.example`](frontend/railway.env.example)
     - `VITE_API_URL` = URL del backend (HTTPS, sin barra final)
     - `VITE_SITE_URL` = URL pública del frontend (HTTPS, sin barra final; vista previa al compartir)
     - Opcional: `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_GA_MEASUREMENT_ID`
   - Generar dominio público → copiar URL (app)
5. **Volver al backend** y poner `CORS_ALLOWED_ORIGINS` = URL del frontend.
6. Redeploy backend y frontend si cambiaste CORS o `VITE_API_URL`.

Orden recomendado: PostgreSQL → backend → frontend → CORS en backend.

### Perfil de producción (backend)

- `spring.jpa.hibernate.ddl-auto=validate` + **Flyway** (`spring-boot-starter-flyway`, obligatorio en Spring Boot 4)
- Base de datos: solo `DATABASE_URL`
- Puerto: `PORT` (Railway)
- Health: `GET /actuator/health`
- CORS: `CORS_ALLOWED_ORIGINS` obligatorio

### Prueba local con Docker

```bash
docker compose -f docker-compose.prod.yml up --build
```

- Frontend: http://localhost:3000  
- API: http://localhost:8080  
- Login con `admin@event.com` / `admin123` (bootstrap por defecto en compose)

---

## Google Search Console y Analytics

### Variables en el frontend (build-time)

| Variable | Descripción |
|----------|-------------|
| `VITE_SITE_URL` | URL pública del frontend (`https://tu-app.up.railway.app`) |
| `VITE_APP_DESCRIPTION` | Texto para meta description y Open Graph |
| `VITE_GOOGLE_SITE_VERIFICATION` | Código del meta tag de verificación de Search Console |
| `VITE_GA_MEASUREMENT_ID` | ID de medición GA4 (`G-XXXXXXXXXX`) |

Tras el deploy, comprueba que existen `https://TU_DOMINIO/robots.txt` y `https://TU_DOMINIO/sitemap.xml`.

### Search Console

1. Entra en [Google Search Console](https://search.google.com/search-console).
2. Añade una propiedad de tipo **Prefijo de URL** con la misma URL que `VITE_SITE_URL`.
3. Elige verificación por **etiqueta HTML** y copia solo el valor del atributo `content` del meta tag.
4. Configúralo en Railway como `VITE_GOOGLE_SITE_VERIFICATION` y redeploy del frontend.
5. En Search Console, envía el sitemap: `https://TU_DOMINIO/sitemap.xml`.

Solo `/` y `/login` están pensados para indexación; el resto de rutas llevan `noindex` (área privada).

### Google Analytics 4

1. Crea una propiedad GA4 y obtén el ID `G-XXXXXXXXXX`.
2. Configúralo en Railway como `VITE_GA_MEASUREMENT_ID` y redeploy.
3. Verifica visitas en **Informes → Tiempo real** al navegar la app.

### Vista previa al compartir enlaces

- Al compartir la URL raíz o `/login`, WhatsApp/Telegram usan `og-image.png`, título y descripción definidos en el build.
- En convocatorias, el menú **Compartir** permite copiar enlace, copiar alineación (con URL) o usar el diálogo nativo del sistema.
- Los enlaces profundos (`/convocatorias/:id`) muestran la vista previa genérica de la app en redes sociales (la app requiere login).

---

## Licencia

Proyecto privado. Consulta al mantenedor del repositorio para condiciones de uso.
