# ERP Backend

# ERP Backend

API em FastAPI para gerenciar produtos, clientes, vendas e financeiro.

## Requisitos

- Python 3.11+
- Postgres (veja docker-compose.yml)
- Pip

## Instalação

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Executando

Configure a variável de ambiente `DATABASE_URL` para o Postgres, por exemplo:
```
DATABASE_URL=postgresql+psycopg://erp:senha@localhost:5432/erp
```

Inicie o servidor:
```powershell
uvicorn app.main:app --reload
```

A documentação interativa estará em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Dados de exemplo

Para popular o banco com dados de teste:
```powershell
.venv\Scripts\python.exe scripts\seed_data.py
```

## Estrutura

- **Produtos**: nome, sku, categoria, fornecedor, custo, preço, estoque, fotos, atributos extras.
- **Clientes**: nome, email, telefone, observações.
- **Vendas**: itens, múltiplas formas de pagamento, cancelamento.
- **Financeiro**: entradas/saídas, categorias, controle de caixa.
