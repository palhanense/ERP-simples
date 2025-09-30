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
#!/bin/sh\nset -eu\n\n# Minimal, POSIX-compatible entrypoint with LF line endings only\n# Wait for Postgres to be ready (if DATABASE_URL points to postgres)\ncase "${DATABASE_URL:-}" in\n  postgresql*|postgresql+*)\n    host=$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:/]*\).*#\1#p' || true)\n    port=5432\n    if [ -n "$host" ]; then\n      echo "Waiting for Postgres on $host:$port..."\n      while ! nc -z "$host" "$port"; do\n        sleep 0.5\n      done\n    fi\n    ;;\n  *)\n    ;;\nesac\n\nmkdir -p /app/data /app/data/product_photos\n\n# Initialize DB (best-effort)\npython -c "from app.database import init_db; init_db()" || true\n\nif [ "${DEV:-}" = "1" ] || [ "${DEV:-}" = "true" ]; then\n  echo "Starting Uvicorn in development mode (reload enabled)..."\n  exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\nelse\n  exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000\nfi\n