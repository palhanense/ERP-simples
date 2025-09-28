# Menju Backend

API em FastAPI para gerenciar produtos, clientes, vendas e financeiro como parte do projeto Menju.

## Requisitos

- Python 3.11+
- Postgres (veja docker-compose.yml)
- Pip

## Instalação

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# instalar o pacote em modo editável para desenvolvimento (opcional, recomendado)
pip install -e .
```

## Executando

Configure a variável de ambiente `DATABASE_URL` para o Postgres, por exemplo:
```
DATABASE_URL=postgresql+psycopg://erp:senha@localhost:5432/erp
```

No desenvolvimento local sem Docker, inicie o servidor (modo recomendável via módulo):
```powershell
python -m uvicorn app.main:app --reload
```

Se estiver usando Docker Compose (recomendado), suba os serviços na raiz do projeto:
```powershell
docker compose up --build
```

A documentação interativa estará em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Dados de exemplo

Para popular o banco com dados de teste (modo recomendável via módulo):
```powershell
python -m app.scripts.seed_data
```

Quando usando Docker Compose, rode o seed dentro do container backend:
```powershell
docker compose exec backend python -m app.scripts.seed_data
```

## Estrutura

-- **Produtos**: nome, sku, categoria, fornecedor, custo, preço, estoque, fotos, atributos extras.
-- **Clientes**: nome, email, telefone, observações.
-- **Vendas**: itens, múltiplas formas de pagamento, cancelamento.
-- **Financeiro**: entradas/saídas, categorias, controle de caixa.

Observações
- Autenticação: será revisada e um scaffold JWT será adicionado para suportar multi-tenant e usuários.
- Migrações: Alembic está presente no projeto; use `alembic upgrade head` para aplicar migrações.
