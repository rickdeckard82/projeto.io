# ---- build stage ----
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Prisma 7 requires DATABASE_URL to be resolvable just to load prisma.config.ts, even for
# `generate` (which never actually connects) — this placeholder is never used to reach a real
# database and is not carried into the runtime stage; the real value comes from docker-compose.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ---- runtime stage ----
FROM node:20-alpine AS runtime
# postgresql16-client: pg_dump do backup automático por FTP (backup/). Mesma versão major do
# Postgres do docker-compose — o pg_dump recusa servidor mais novo que ele.
RUN apk add --no-cache openssl postgresql16-client
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
