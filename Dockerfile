# Despliegue unificado: build del frontend + API Spring Boot en un solo contenedor.
# Ventajas frente a Nginx separado: un dominio, sin proxy ni CORS extra, un solo servicio en Railway.

# --- 1. Frontend (Vite → static) ---
FROM node:22-alpine AS frontend
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Mismo origen: las peticiones van a /api/... en el propio host
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- 2. Backend (Maven + static embebido) ---
FROM eclipse-temurin:25-jdk-alpine AS backend
WORKDIR /app

RUN apk add --no-cache bash

COPY --from=frontend /frontend/dist /app/src/main/resources/static

COPY backend/mvnw backend/mvnw.cmd backend/pom.xml ./
COPY backend/.mvn .mvn

RUN chmod +x mvnw && ./mvnw -q dependency:go-offline -DskipTests

COPY backend/src src

RUN ./mvnw -q package -DskipTests

# --- 3. Runtime ---
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=backend /app/target/*.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]
