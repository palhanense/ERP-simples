# ERP (Frontend + Backend)

Este repositório contém a interface web (frontend) e a API (backend) do ERP usado para gerenciar produtos, clientes, vendas e o novo módulo financeiro (despesas/receitas).

Este README principal resume como configurar e executar o sistema em Windows, como povoar o banco de dados de exemplo e como solucionar problemas comuns.

## Sumário

- Requisitos
- Quickstart (Windows)
	- Backend
	- Frontend
- Seed / popular banco de dados
- Scripts de execução úteis (`.bat`)
- Solução de problemas (Windows)
- Estrutura do projeto
- Endpoints importantes (rápido)

## Requisitos

- Python 3.11+
- Node.js 18+ e `npm`
- Git (opcional)

Recomendado: abrir dois terminais separados (um para backend, outro para frontend).

## Quickstart (Windows)

As instruções a seguir assumem que você está na pasta raiz do repositório.

### Backend

1. Abra um terminal (cmd.exe ou PowerShell) e vá para a pasta do backend:

```powershell
cd "c:\Users\abmme\OneDrive\Desktop\ERP sistema\erp-backend"
```

2. Crie e ative um ambiente virtual, instale dependências:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
```

3. (Opcional) Popule o banco com dados de exemplo (veja seção "Seed"):

```powershell
.venv\Scripts\python.exe scripts\seed_data.py
```

4. Execute o servidor FastAPI (modo desenvolvimento):

```powershell
# usando uvicorn a partir do venv
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Depois de iniciado, a API estará em `http://127.0.0.1:8000` e a documentação interativa em `http://127.0.0.1:8000/docs`.

### Frontend

1. Abra um segundo terminal e vá para a pasta do frontend:

```powershell
cd "c:\Users\abmme\OneDrive\Desktop\ERP sistema\erp-frontend"
```

2. Instale dependências e defina a variável de ambiente da API (opcional):

```powershell
npm install
# Crie um arquivo .env na pasta erp-frontend com a linha abaixo (se quiser sobrescrever o padrão):
echo VITE_API_URL=http://127.0.0.1:8000 > .env
```

3. Inicie o servidor de desenvolvimento (recomendo usar `cmd.exe` se o PowerShell apresentar problemas ao colar comandos longos):

```powershell
# Em cmd.exe prefira: npm run dev -- --host
npm run dev -- --host
```

O Vite deverá mostrar algo como "Local: http://localhost:5173". Abra `http://localhost:5173` no navegador.

## Seed / popular banco de dados

O backend inclui o script `scripts/seed_data.py` que cria `data/erp.db` (SQLite) e popula tabelas quando estão vazias.

Execute a partir da pasta `erp-backend` com o venv ativo:

```powershell
.venv\Scripts\python.exe scripts\seed_data.py
```

Se desejar reiniciar os dados de teste, pare o servidor e remova o arquivo `erp-backend\data\erp.db` antes de rodar o seed novamente.

## Scripts .bat úteis

Você pode criar dois arquivos para iniciar os serviços em janelas separadas (útil para evitar problemas de colagem no PowerShell):

- `start_backend.bat` (coloque em `erp-backend`):

```bat
@echo off
cd /d "%~dp0"
python -m venv .venv
call .venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- `start_frontend.bat` (coloque em `erp-frontend`):

```bat
@echo off
cd /d "%~dp0"
npm install
npm run dev -- --host
```

Use uma janela de terminal por script para ver logs e parar com Ctrl+C.

## Solução de problemas (Windows)

- Vite aparece como "ready" mas o navegador não conecta em `http://localhost:5173`:
	- Tente `http://127.0.0.1:5173` em vez de `localhost`.
	- Inicie o Vite com `--host` ou `--host 127.0.0.1` para forçar o binding adequado.
	- Verifique firewall e se outra aplicação já está usando a porta (ex.: `netstat -ano | findstr :5173`).

- PowerShell falha ao colar comandos grandes (PSReadLine error):
	- Use `cmd.exe` para rodar os comandos ou salve-os em `.bat` e execute.

- SQLite diz "unable to open database file":
	- Garanta que você está no diretório `erp-backend` ao rodar o seed ou ao iniciar o uvicorn; o caminho do DB é relativo (`data/erp.db`).
	- Verifique permissões do arquivo e se não há outro processo bloqueando o DB.

- Alterações de modelo (nova tabela) não aparecem: reinicie o backend.
	- O arquivo `app/main.py` cria tabelas na inicialização (init_db) — reinicie o uvicorn para aplicar mudanças no schema.

## Estrutura do projeto (visão rápida)

- `erp-backend/` — API FastAPI, SQLAlchemy, scripts e banco `data/erp.db`.
- `erp-frontend/` — App React + Vite + Tailwind; componentes em `src/components`, client API em `src/lib/api.js`.

Existem READMEs específicos em `erp-backend/README.md` e `erp-frontend/README.md` com detalhes de cada parte.

## Endpoints importantes (rápido)

- Documentação: `GET /docs` (quando backend rodando).
- Financeiro (novo módulo):
	- `GET /financial-entries` — lista entradas financeiras (aceita `?type=despesa` ou `?type=receita`).
	- `POST /financial-entries` — cria entrada financeira.
	- `PUT /financial-entries/{id}` — atualiza.
	- `DELETE /financial-entries/{id}` — remove.
	- `GET /categories`, `POST /categories` — gerenciam categorias usadas nas entradas.
