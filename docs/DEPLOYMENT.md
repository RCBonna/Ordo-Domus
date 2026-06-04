# Deployment

## Indice

1. [Ambientes](#ambientes)
2. [Variaveis de Ambiente](#variaveis-de-ambiente)
3. [Build](#build)
4. [Banco de Dados](#banco-de-dados)
5. [Deploy Frontend](#deploy-frontend)
6. [CI/CD](#cicd)
7. [Docker e Kubernetes](#docker-e-kubernetes)
8. [Rollback](#rollback)
9. [Checklist](#checklist)

## Ambientes

Ambientes inferidos:

| Ambiente | Evidencia |
| --- | --- |
| Local | `npm run dev` em porta 3000. |
| AI Studio | README original menciona AI Studio app. |
| Vercel | Comentario em `src/lib/supabaseClient.ts` cita chaves na Vercel. |
| Supabase | Banco/Auth/RPC/RLS. |

## Variaveis de Ambiente

| Variavel | Obrigatoria | Observacao |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave anon publica, protegida por RLS. |
| `VITE_GEMINI_API_KEY` | Nao | Legado; remover dos ambientes de frontend apos deploy da Edge Function. |
| `GEMINI_API_KEY` | Sim para Edge Function | Configurar com `supabase secrets set GEMINI_API_KEY=...`. |

Nao versionar `.env.local`; `.gitignore` ja ignora `.env*`.

## Build

Comandos:

```bash
npm install
npm run lint
npm run build
npm run preview
```

Config Vite:

- React plugin.
- Tailwind plugin.
- alias `@` para raiz do projeto.
- limite de chunk aumentado para 1500.
- HMR controlado por `DISABLE_HMR`.

## Banco de Dados

Passos recomendados:

1. Criar projeto Supabase.
2. Executar as migrations versionadas em `supabase/migrations/`, iniciando pela baseline `20260501000000_initial_schema_baseline.sql`.
3. Validar que tabelas usam `membros_unidades`, nao `membros_unidade`.
4. Aplicar indices de `sql/optimize_performance.sql`, revisando nomes.
5. Criar system admin inicial manualmente:

```sql
insert into system_admins (user_id) values ('<uuid-do-admin>');
```

## Deploy Frontend

### Vercel

Configuracao esperada:

| Campo | Valor |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |
| Environment variables | Variaveis `VITE_*` |

### AI Studio/Cloud Run

README original indica execucao gerenciada pelo AI Studio. O build continua sendo Vite.

## CI/CD

Nao ha pipeline no repositorio. Pipeline recomendado:

1. Install: `npm ci`.
2. Typecheck: `npm run lint`.
3. Build: `npm run build`.
4. Security: `npm audit --audit-level=high`.
5. E2E smoke: Playwright autenticando em ambiente de teste.
6. Deploy preview.
7. Deploy producao com aprovacao.

## Docker e Kubernetes

Nao ha `Dockerfile`, `docker-compose.yml` ou manifests Kubernetes.

Dockerfile sugerido:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

Para Kubernetes, servir como app estatico e configurar variaveis no build ou usar runtime config externo.

## Rollback

Frontend:

- Vercel: promover deploy anterior.
- Cloud Run: voltar revisao anterior.

Banco:

- sem migrations versionadas, rollback e manual e arriscado.
- recomendacao: adotar Supabase CLI e migrations reversiveis quando possivel.

## Checklist

- `npm run lint` passa.
- `npm run build` passa.
- Variaveis existem no ambiente.
- RLS ativa em todas as tabelas.
- Usuario admin inicial criado.
- Gemini protegido por backend antes de producao publica.
- Politicas de convidado revisadas.
- Backup do banco antes de migrations.
