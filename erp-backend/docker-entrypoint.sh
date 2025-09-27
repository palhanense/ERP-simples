#!/usr/bin/env bash
set -euo pipefail

# Wait for Postgres to be ready (if using postgres)
if [[ "${DATABASE_URL:-}" == postgresql* || "${DATABASE_URL:-}" == postgresql+* ]]; then
  # parse host and port roughly
  host=$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:/]*\).*#\1#p') || true
  port=5432
  if [ -n "$host" ]; then
    echo "Waiting for Postgres on $host:$port..."
    until nc -z "$host" "$port"; do
      sleep 0.5
    done
  fi
fi

# Ensure data directories exist
mkdir -p /app/data /app/data/product_photos

# Run lightweight DB init via app code (this will create tables if needed)
python -c "from app.database import init_db; init_db()"

# Start Uvicorn
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
