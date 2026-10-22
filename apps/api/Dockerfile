FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl libc6-compat

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api
RUN find prisma/migrations -name '*.sql' -exec sed -i 's/\r$//' {} + \
  && sed -i 's/\r$//' docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
