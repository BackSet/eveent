@echo off
set SPRING_PROFILES_ACTIVE=dev
set DB_URL=jdbc:postgresql://localhost:5432/event
set DB_USERNAME=postgres
set DB_PASSWORD=nSpass_01M
set JWT_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
set JWT_EXPIRATION=86400000
set CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000
set CORS_ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
set CORS_ALLOWED_HEADERS=Authorization,Content-Type,Origin,Accept,X-Requested-With
set CORS_EXPOSED_HEADERS=Authorization
set CORS_MAX_AGE=3600
set ADMIN_BOOTSTRAP_ENABLED=true
set ADMIN_USERNAME=admin
set ADMIN_EMAIL=admin@event.com
set ADMIN_INITIAL_PASSWORD=nSpass_01M
set ADMIN_NOMBRE=Super Admin
set JAVA_HOME=C:\Program Files\Java\jdk-25
set PATH=%JAVA_HOME%\bin;%PATH%
call mvnw spring-boot:run