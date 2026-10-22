#!/bin/sh
set -e

echo "Waiting for PostgreSQL and applying migrations..."
npx prisma migrate deploy

echo "Seeding development data..."
npx prisma db seed

echo "Starting SportSpace API..."
exec node dist/main.js
