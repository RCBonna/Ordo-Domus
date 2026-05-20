# Integracoes

## Indice

1. [Resumo](#resumo)
2. [Supabase](#supabase)
3. [Gemini](#gemini)
4. [Browser APIs](#browser-apis)
5. [Hospedagem](#hospedagem)
6. [Webhooks, Filas e Cache](#webhooks-filas-e-cache)
7. [Riscos e Melhorias](#riscos-e-melhorias)

## Resumo

O projeto possui integracoes diretas com Supabase e Gemini. Tambem depende de APIs nativas do navegador para voz, arquivos, imagem e clipboard.

## Supabase

Uso:

- Auth por email/senha.
- Persistencia de dados.
- RPCs PL/pgSQL.
- RLS multi-tenant.

Cliente:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  }
})
```

Autenticacao externa: JWT Supabase gerenciado pelo SDK.

## Gemini

Pacote:

Status P0: o frontend nao importa mais `@google/genai`. As chamadas de IA foram movidas para a Edge Function `extract-inventory`.

Modelos tentados:

- `gemini-2.5-flash`
- `gemini-flash-latest`
- `gemini-2.0-flash-lite`
- `gemini-pro-latest`

Casos de uso:

| Funcao | Entrada | Saida |
| --- | --- | --- |
| `extractInventoryData` | Texto livre | Item estruturado. |
| `extractInventoryDataFromAudio` | Audio Base64 + MIME | Item estruturado e transcricao. |
| `extractInventoryDataFromReceipt` | Imagem Base64 + MIME | Lista de itens brutos. |

Risco residual: a chave Gemini fica protegida somente depois que `GEMINI_API_KEY` for configurada como secret da Edge Function e `VITE_GEMINI_API_KEY` for removida dos ambientes de frontend.

## Browser APIs

| API | Uso |
| --- | --- |
| `navigator.mediaDevices.getUserMedia` | Capturar microfone. |
| `MediaRecorder` | Gravar audio. |
| `FileReader` | Converter audio/imagem em Base64. |
| Canvas | Comprimir imagem para WebP. |
| `navigator.clipboard.writeText` | Copiar codigo da unidade. |
| `localStorage` | Persistir unidade ativa. |
| `crypto.randomUUID` | Gerar ID de unidade no frontend. |

## Hospedagem

Evidencias:

- README menciona AI Studio.
- Comentario no Supabase client menciona Vercel.
- App e estatico Vite e pode ser publicado em Vercel, Netlify, Cloud Run com Nginx ou similar.

## Webhooks, Filas e Cache

Nao foram encontrados:

- webhooks;
- filas;
- workers;
- Redis/cache;
- cron jobs;
- Supabase Edge Functions.

Necessidades futuras:

- limpeza de `importacoes_pendentes.expires_at`;
- rate limit para IA;
- processamento server-side de OCR;
- notificacoes de validade.

## Riscos e Melhorias

1. Mover Gemini para backend.
2. Adicionar fila/cron para limpeza de pendencias.
3. Implementar cache local controlado para inventario.
4. Adicionar webhooks/notificacoes para validade e estoque critico.
5. Formalizar contrato de integracao com Supabase em tipos gerados.
