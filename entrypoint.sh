#!/bin/sh
set -e

# First boot: copy the initial catalog images into the persistent uploads volume
# (used when product images are stored on local disk).
if [ -d /opt/seed/uploads ] && [ -z "$(ls -A /app/public/uploads 2>/dev/null)" ]; then
  cp -a /opt/seed/uploads/. /app/public/uploads/ 2>/dev/null || true
  echo "[init] seeded uploads"
fi

export DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required (PostgreSQL)}"
export NEXTAUTH_URL="${NEXTAUTH_URL:?NEXTAUTH_URL is required}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:?NEXTAUTH_SECRET is required}"

exec node node_modules/next/dist/bin/next start -p "${PORT:-3000}"