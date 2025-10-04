# Menju — ERP simples (Frontend + Backend)

Este repositório contém o frontend (React + Vite) e o backend (FastAPI + SQLAlchemy) do Menju — um ERP simples para gerenciar produtos, clientes, vendas e financeiro.

Este README explica como executar o projeto (via Docker Compose ou localmente), como rodar seeds e testes, e links úteis para desenvolvimento.

## Visão geral

- Backend: FastAPI + SQLAlchemy + Alembic (Python 3.11+)
- Frontend: React + Vite + Tailwind
- Banco: PostgreSQL (via Docker Compose)

O compose inclui três serviços: `db` (Postgres), `backend` (FastAPI) e `frontend` (Vite dev server).

## Principais recursos

- Autenticação baseada em JWT (endpoints em `/auth`).
- Multi-tenancy (Option B): e-mails únicos globalmente; cada usuário tem um `tenant_id`.
- Alembic para migrações (`erp-backend/alembic/versions`).
- Scripts de utilitários e seeds em `erp-backend/app/scripts`.

---

## Requisitos

- Docker & Docker Compose (recomendado)
- Python 3.11+
- Node.js 18+ e npm

---

## Executando tudo via Docker (recomendado para dev)

1. Na raiz do projeto, suba os serviços:

```powershell
docker compose up --build
```

2. URLs úteis:

- Backend (FastAPI): http://localhost:8000 (docs em `/docs`)
- Frontend (Vite): http://localhost:5173

Para resetar os dados do Docker-compose:

```powershell
docker compose down -v
```

---

## Desenvolvimento local (sem Docker)

### Backend

1. Crie e ative um virtualenv:

```powershell
cd erp-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Variáveis de ambiente de exemplo:

```powershell
$env:DATABASE_URL = 'postgresql+psycopg://erp:senha@localhost:5432/erp'
$env:SECRET_KEY = 'dev-secret'
$env:ACCESS_TOKEN_EXPIRE_MINUTES = '60'
```

3. Rodar migrações:

```powershell
cd erp-backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

4. Rodar em modo dev:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

1. Instale dependências e rode o dev server:

```powershell
cd erp-frontend
npm install
npm run dev -- --host
```

Abra `http://localhost:5173`.

---

## Seed / popular banco

Os scripts de seed estão em `erp-backend/app/scripts` e podem ser executados via módulo:

```powershell
cd erp-backend
.\.venv\Scripts\Activate.ps1
python -m app.scripts.seed_admin
python -m app.scripts.seed_data
```

---

## Testes

Execute a suíte de testes do backend:

```powershell
cd erp-backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

---

## VS Code / Pylance

- Aponte o interpretador do workspace para `.venv\Scripts\python.exe`.
- Se o Pylance reclamar de imports, instale dependências de desenvolvimento:

```powershell
pip install -r erp-backend/requirements-dev.txt
```
