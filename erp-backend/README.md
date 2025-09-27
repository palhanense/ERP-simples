# ERP Backend

API em FastAPI para gerenciar produtos, clientes e vendas para lojas pequenas.

## Requisitos

- Python 3.11+
- Pip (ou outro gerenciador compativel)

## Instalacao

`ash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
`

## Executando

`ash
uvicorn app.main:app --reload
`

A documentacao interativa fica em http://127.0.0.1:8000/docs.

## Modulos disponiveis

- **Produtos**: campos nome, sku, categoria, custo, preco, estoque minimo, lista de fotos e atributos extras configuraveis.
- **Clientes**: cadastro basico com nome, documento, email, telefone e observacoes.
- **Vendas**: itens com quantidade e preco, multiplas formas de pagamento (dinheiro, cartao, pix, fiado) e controle de cancelamento.

Pagamentos fiado sao destacados nos retornos para alimentar relatorios de contas a receber. Os dados ficam em SQLite (data/erp.db).
## Dados de exemplo

Para preparar o banco SQLite com dados basicos de clientes, produtos e vendas de teste:

```
.venv\Scripts\python.exe scripts\seed_data.py
```

O script cria o arquivo `data/erp.db` caso nao exista e popula registros apenas quando as tabelas estao vazias.
