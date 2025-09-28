
# ERP (Frontend + Backend)

Este repositório contém a interface web (frontend) e a API (backend) do ERP para gestão de produtos, clientes, vendas e financeiro.

## Requisitos

- Python 3.11+
- Node.js 18+ e `npm`
- Docker (opcional, recomendado para ambiente completo)
- Git (opcional)

## Quickstart

### Usando Docker (recomendado)

1. Na raiz do projeto, execute:
	```powershell
	docker-compose up --build
	```
	Isso irá subir o banco Postgres, o backend FastAPI e o frontend React.

2. Acesse:
	- Backend: [http://localhost:8000/docs](http://localhost:8000/docs)
	- Frontend: [http://localhost:5173](http://localhost:5173)

### Manual (sem Docker)

#### Backend

1. Crie e ative um ambiente virtual:
	```powershell
	cd erp-backend
	python -m venv .venv
	.\.venv\Scripts\activate
	pip install -r requirements.txt
	```
2. Configure a variável de ambiente `DATABASE_URL` para o Postgres (exemplo: `postgresql+psycopg://erp:senha@localhost:5432/erp`).
3. Execute o backend:
	```powershell
	uvicorn app.main:app --reload
	```

#### Frontend

1. Instale as dependências:
	```powershell
	cd erp-frontend
	npm install
	```
2. (Opcional) Crie um arquivo `.env` com a URL da API:
	```
	VITE_API_URL=http://127.0.0.1:8000
	```
3. Inicie o frontend:
	```powershell
	npm run dev -- --host
	```

## Seed / Popular banco de dados

Execute o script de seed para popular o banco Postgres com dados de exemplo:
```powershell
cd erp-backend
.venv\Scripts\python.exe scripts\seed_data.py
```

## Estrutura do projeto

- `erp-backend/` — API FastAPI, SQLAlchemy, scripts e banco Postgres.
- `erp-frontend/` — App React + Vite + Tailwind; componentes em `src/components`, client API em `src/lib/api.js`.

---
