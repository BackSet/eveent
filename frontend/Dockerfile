# SPA React (Vite) servida con Nginx

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_APP_NAME=Event
ARG VITE_SITE_URL
ARG VITE_APP_DESCRIPTION
ARG VITE_GOOGLE_SITE_VERIFICATION
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION
ENV VITE_GOOGLE_SITE_VERIFICATION=$VITE_GOOGLE_SITE_VERIFICATION
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

RUN npm run build

FROM nginx:1.27-alpine

# Railway inyecta PORT; la imagen oficial aplica envsubst desde /etc/nginx/templates/
ENV PORT=80
ENV NGINX_ENVS=PORT
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
