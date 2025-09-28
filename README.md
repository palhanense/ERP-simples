
# Menju (Frontend + Backend)

Este repositório contém a interface web (frontend) e a API (backend) do Menju — um sistema simples para gestão de produtos, clientes, vendas e financeiro. O projeto é composto por um backend em Python/FastAPI e um frontend em React (Vite + Tailwind). O repositório inclui uma configuração `docker-compose` para facilitar o desenvolvimento completo (banco, backend e frontend).

## Requisitos

- Python 3.11+
- Node.js 18+ e `npm`
- Docker (opcional, recomendado para ambiente completo)
# Menju — ERP simples (Frontend + Backend)

Este repositório contém um sistema ERP simples composto por:
- Backend: FastAPI + SQLAlchemy + Alembic (Python 3.11+)
- Frontend: React + Vite + Tailwind
- Banco de dados: PostgreSQL (via Docker Compose)

O objetivo deste README é explicar como executar o projeto localmente (via Docker Compose e manualmente), como trabalhar no desenvolvimento (migrations, seeds, testes) e descrever as decisões de autenticação/tenancy adotadas.

## Visão geral
- O backend expõe a API em `/` (docs Swagger em `/docs` quando executado localmente).
- O frontend roda em Vite e consome a API do backend.
- O compose traz 3 serviços: `db` (Postgres), `backend` (FastAPI) e `frontend` (Vite dev server).

<<<<<<< HEAD
## Principais recursos implementados
- Autenticação baseada em JWT (endpoints em `/auth`), com helpers para criação/verificação de tokens em `erp-backend/app/auth.py`.
- Multi-tenancy *Option B*: usuários possuem e-mails globalmente únicos; cada usuário pertence a um `tenant_id`. Regras de autorização usam `tenant_id` presente no JWT para proteger recursos quando necessário.
- Alembic para migrações de schema (pasta `erp-backend/alembic/versions`).
- Scripts de utilitários e seeds em `erp-backend/scripts`.

---

## Requisitos
- Docker & Docker Compose (recomendado)
- Python 3.11+ (para execução manual do backend)
- Node.js 18+ e npm (para execução manual do frontend)

---

## Executando tudo via Docker (recomendado para dev)
1. Na raiz do projeto, suba serviços:

```powershell
docker compose up --build
```

2. URLs úteis (padrões):
- Backend (FastAPI): http://localhost:8000
	- OpenAPI / docs: http://localhost:8000/docs
- Frontend (Vite): http://localhost:5173
- Postgres exposto em localhost:5432 (usar apenas para debug; containers se conectam internamente ao serviço `db`).

Notas:
- O compose monta o diretório do backend na imagem, permitindo editar código local e ver as alterações sem rebuild.
- Para resetar o banco de dados usado pelo compose, destrua o volume:
	```powershell
	docker compose down -v
	```

---
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
