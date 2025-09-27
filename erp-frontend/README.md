# ERP Frontend

Interface web construida com React, Vite e TailwindCSS para complementar o ERP.
A identidade utiliza paleta preto/branco, tipografia Montserrat e modos Dia/Noite.

## Conceitos visuais

- Paleta neutra: fundo claro ou escuro com alto contraste.
- Hierarquia objetiva: titulos em caixa alta e bastante espaamento.
- Espacos de respiro: cards arredondados e margens generosas.
- Tipografia Montserrat: aplicada globalmente com pesos 300-700.
- Modo Dia/Noite: alternancia manual persistida em `localStorage`.

## Estrutura de pastas

```
.
+-- public/
|   +-- favicon.svg
+-- src/
|   +-- App.jsx
|   +-- index.css
|   +-- main.jsx
|   +-- components/
|   |   +-- CreateSaleDialog.jsx
|   |   +-- CustomersView.jsx
|   |   +-- HighlightRow.jsx
|   |   +-- NavigationTabs.jsx
|   |   +-- ProductsView.jsx
|   |   +-- SalesView.jsx
|   +-- lib/
|       +-- api.js
+-- index.html
+-- package.json
+-- postcss.config.js
+-- tailwind.config.js
+-- vite.config.js
```

## Configuracao

- Requer Node.js 18+ (LTS) e `npm`.
- O backend FastAPI deve estar rodando (padrao `http://127.0.0.1:8000`).
- Ajuste a URL via `.env` na raiz se necessario:

```
VITE_API_URL=http://127.0.0.1:8000
```

## Desenvolvimento

```bash
npm install
npm run dev
```

O servidor inicia em `http://localhost:5173`. As listas de produtos, clientes e vendas usam a API; o modal de venda permite escolher cliente, itens, dividir pagamentos (dinheiro, cartao, pix, fiado) e cancelar vendas.

## Build

```bash
npm run build
npm run preview
```

> Para manter o visual consistente, evite adicionar cores fora da paleta neutra sem revisar o design.
