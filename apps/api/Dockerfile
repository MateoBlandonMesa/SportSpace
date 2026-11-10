FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get -o Acquire::Check-Date=false update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --ignore-scripts
RUN apt-get -o Acquire::Check-Date=false update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm rebuild argon2

COPY apps/api apps/api
WORKDIR /app/apps/api

RUN for attempt in 1 2 3 4 5; do ../../node_modules/.bin/prisma generate && exit 0; echo "Prisma generate failed (attempt $attempt/5); retrying" >&2; sleep 8; done; exit 1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get -o Acquire::Check-Date=false update \
  && apt-get install -y --no-install-recommends openssl libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api
RUN find prisma/migrations -name '*.sql' -exec sed -i 's/\r$//' {} + \
  && sed -i 's/\r$//' docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
