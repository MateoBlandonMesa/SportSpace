#!/bin/sh
set -e

echo "Waiting for PostgreSQL and applying migrations..."
./node_modules/.bin/ prisma migrate deploy

echo "Seeding development data..."
./node_modules/.bin/ prisma db seed

echo "Starting SportSpace API..."
exec node dist/main.js
