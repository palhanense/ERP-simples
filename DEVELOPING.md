Local development notes
=======================

This project uses a Python FastAPI backend in `erp-backend` and a Vite React frontend in `erp-frontend`.

Quickstart (Windows PowerShell)
-------------------------------

1. Create / activate the editor virtualenv (we use `.venv2` in the workspace for consistency):

   & .\.venv2\Scripts\Activate.ps1

2. Install backend requirements (once):

   python -m pip install -r erp-backend\requirements.txt

3. Start Postgres (docker-compose):

   docker-compose up -d db

4. Apply migrations (inside the backend container or from host if DB is reachable):

   cd erp-backend
   alembic upgrade head

   If Alembic reports multiple heads or conflicts, inspect `erp-backend/alembic/versions` and consider creating a merge revision.

5. Seed a default tenant/admin (from inside the backend environment):

   python -m erp_backend.scripts.seed_admin

   or run the provided `erp-backend/scripts/seed_admin.py` directly:

   python erp-backend/scripts/seed_admin.py

VS Code
-------

Set the workspace Python interpreter to `.venv2\Scripts\python.exe`. Add `erp-backend` to `python.analysis.extraPaths` so the language server resolves the `app` package.

Notes
-----
- In development the project uses `pbkdf2_sha256` for password hashing to avoid native `bcrypt` build issues in containers. Change to a stronger/better-installed algorithm for production (bcrypt/argon2).
- Secrets (SECRET_KEY) are currently in `docker-compose.yml` for development convenience; move them to environment or secret manager for production.
