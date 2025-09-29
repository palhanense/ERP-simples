#!/bin/sh
set -eu

# Minimal, POSIX-compatible entrypoint with LF line endings only
# Wait for Postgres to be ready (if DATABASE_URL points to postgres)
case "${DATABASE_URL:-}" in
  postgresql*|postgresql+*)
    host=$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:/]*\).*#\1#p' || true)
    port=5432
    if [ -n "$host" ]; then
      echo "Waiting for Postgres on $host:$port..."
      while ! nc -z "$host" "$port"; do
        sleep 0.5
      done
    fi
    ;;
  *)
    ;;
esac

mkdir -p /app/data /app/data/product_photos

# Initialize DB (best-effort)
python -c "from app.database import init_db; init_db()" || true

if [ "${DEV:-}" = "1" ] || [ "${DEV:-}" = "true" ]; then
  echo "Starting Uvicorn in development mode (reload enabled)..."
  exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
  exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
