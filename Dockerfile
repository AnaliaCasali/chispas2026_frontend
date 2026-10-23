# Etapa 1: instala dependencias y compila el build de producción (los tests corren en el CI)
FROM node:22-alpine AS build
WORKDIR /app

# primero solo package*.json para aprovechar la cache de capas
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: imagen liviana solo con el artefacto compilado
FROM node:22-alpine
WORKDIR /app

# no corre como root
RUN addgroup -S chispas && adduser -S chispas -G chispas
USER chispas

COPY --from=build /app/dist/chispas2026_frontend ./dist/chispas2026_frontend

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

ENTRYPOINT ["node", "dist/chispas2026_frontend/server/server.mjs"]