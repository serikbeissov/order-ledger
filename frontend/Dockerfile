# Frontend: сборка статики Vite, отдаётся через nginx (CLAUDE.md §6)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Финальный образ — только собранная статика в томе для nginx
FROM busybox:1.36
WORKDIR /dist
COPY --from=build /app/dist /dist
# статика копируется в общий том при старте
CMD ["sh", "-c", "cp -r /dist/. /usr/share/nginx/html/ && tail -f /dev/null"]
