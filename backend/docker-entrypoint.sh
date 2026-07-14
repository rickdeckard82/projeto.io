#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database (no-op if already seeded)..."
npx prisma db seed || true

echo "Starting backend..."
exec node dist/main.js
