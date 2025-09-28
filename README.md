
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

## Desenvolvimento manual (sem Docker)
Use este fluxo se preferir rodar backend e frontend locally sem containers.

### Backend (local)
1. Crie o virtualenv e ative:

```powershell
cd erp-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Configure variáveis de ambiente (exemplo mínimo):

```powershell
$env:DATABASE_URL = 'postgresql+psycopg://erp:senha@localhost:5432/erp'
$env:SECRET_KEY = 'dev-secret'
$env:ACCESS_TOKEN_EXPIRE_MINUTES = '60'
```

3. Rodar migrações (Alembic):

```powershell
cd erp-backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

4. Rodar a API em modo dev:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (local)
1. Instale dependências e rode o dev server:

```powershell
cd erp-frontend
npm install
npm run dev -- --host
```

2. Se não estiver usando Docker, aponte `VITE_API_URL` para a URL do backend (ex: http://127.0.0.1:8000) em um arquivo `.env` na pasta `erp-frontend`.

---

## Banco de dados, migrações e seed
- Migrations: a pasta `erp-backend/alembic` contém versões. Use Alembic (via `alembic` CLI) para aplicar.
- Seed: scripts de seed estão em `erp-backend/scripts/`. Exemplo:

```powershell
cd erp-backend
.\.venv\Scripts\python.exe scripts/seed_data.py
```

Observação: o seed é idempotente e protegerá contra duplicações quando executado múltiplas vezes.

---

## Autenticação e multi-tenancy
- Arquivo principal: `erp-backend/app/auth.py` — helpers para criar e decodificar JWTs e para hashing/verificação de senhas (usa `passlib`, carregado de forma "lazy" para gerar mensagens de erro mais amigáveis quando não instalado).
- O token JWT contém `sub` (id do usuário) e `tenant_id` (quando aplicável). Em requests autenticados, o backend valida o token e extrai esses valores.
- Decisão de tenancy: "Option B" — e-mails são únicos globalmente; cada usuário tem um `tenant_id`. Isso simplifica autenticação e o modelo de login.

Segurança/Dev notes:
- Em produção, mude `SECRET_KEY` para um valor seguro e não o mantenha em arquivos de texto.
- Tokens são assinados com o algoritmo definido por `JWT_ALGORITHM` (default HS256).

---

## Testes
- O backend usa `pytest`. Há `conftest.py` de testes para facilitar a execução sem um Postgres real durante a coleta.

Executar testes (no ambiente virtual do backend):

```powershell
cd erp-backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

---

## VS Code / Pylance recomendações
- Recomenda-se apontar o interpretador Python do workspace para o virtualenv local (`.venv\Scripts\python.exe`). Há uma configuração já presente em `.vscode/settings.json` que aponta para `.venv2` — ajuste para `.venv` se preferir.
- Se o Pylance reclamar de `jose` ou `passlib`, instale os pacotes no venv: `pip install python-jose passlib`.

---

## Limpeza acidental de artefatos
- Atenção: não comite virtualenvs (`.venv`, `.venv2`). `.gitignore` já contém `.venv/` e `erp-backend/.venv/`. Caso tenha sido comitado por engano, remova do índice com:

```powershell
git rm -r --cached .venv2
```

---

## Contribuindo / fluxo sugerido
- Trabalhe em branches curtos por feature (ex.: `feat/auth-login`).
- Abra Pull Requests (PRs) para revisão e CI antes de mesclar em `main`.
- Execute testes localmente antes de abrir PR.

---

## Troubleshooting rápido
- Frontend diz "Failed to fetch" ao chamar a API:
	- Verifique se o backend está rodando e exposto (porta 8000).
	- Se usando Docker, assegure que o compose backend levantou sem erros e que o container `backend` depende do `db`.
	- Em dev não-Docker, ajuste `VITE_API_URL` para apontar ao backend.

- Erros de import no editor (Pylance): verifique se o workspace usa o venv correto e instale dependências.

---

## Arquitetura resumida e próximos passos
- Arquitetura: FastAPI (API) ↔ Postgres (dados) + React (UI).
- Próximo trabalho sugerido:
	- Expandir endpoints de autorização/roles.
	- Políticas de tenant-level authorization (ex.: middleware para bloquear acesso entre tenants).
	- Melhorar UX de login e refresh de tokens (refresh tokens, cookies httpOnly, CSRF).

---

Se quiser, eu posso:
- Criar um PR com este README atualizado (criar branch e abrir PR);
- Ajustar `.vscode/settings.json` para apontar para `.venv` por padrão;
- Rodar a suíte de testes e reportar resultados.

Escolha o próximo passo e eu executo.
