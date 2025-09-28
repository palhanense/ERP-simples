
# Menju Frontend

Interface web construída com React, Vite e TailwindCSS. Esta é a parte cliente do Menju e consome a API REST do backend.

## Requisitos

- Node.js 18+ (LTS)
- Backend FastAPI rodando (padrão: http://127.0.0.1:8000)

## Instalação

```powershell
npm install
```

## Configuração

Crie um arquivo `.env` na raiz (opcional):
```
VITE_API_URL=http://127.0.0.1:8000
```
Quando usando Docker Compose, o container frontend já é iniciado com variáveis de ambiente apropriadas para se comunicar com o serviço backend.

## Desenvolvimento

```powershell
npm run dev -- --host
```

Acesse [http://localhost:5173](http://localhost:5173).

## Estrutura

- `src/components/` — componentes de UI (produtos, clientes, vendas, financeiro, etc)
- `src/lib/api.js` — integração com a API backend

Observações
- Autenticação: a aplicação frontend ainda não possui telas de login; um `AuthContext` e páginas de login serão adicionados quando o scaffold de autenticação for implementado no backend.

## Build

```powershell
npm run build
```

```bash
npm run build
npm run preview
```

> Para manter o visual consistente, evite adicionar cores fora da paleta neutra sem revisar o design.
