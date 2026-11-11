#!/bin/sh
set -e

echo "Waiting for PostgreSQL and applying migrations..."
../../node_modules/.bin/prisma migrate deploy

echo "Seeding development data..."
node -r ts-node/register prisma/seed.ts

echo "Starting SportSpace API..."
exec node dist/main.js
