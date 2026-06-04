# P1 - Rate Limit da Edge Function de IA

Status operacional: implementado, migration aplicada no Supabase e Edge Function `extract-inventory` redeployada em 2026-05-23.

## Objetivo

Proteger custo, disponibilidade e UX dos fluxos de extracao por IA antes da chamada ao Gemini. A Edge Function agora valida payload, MIME, tamanho e janela de uso por usuario/unidade/modo.

## Limites Padrao

| Modo | Janela | Requisicoes | Tamanho/payload | MIME permitido |
| --- | ---: | ---: | ---: | --- |
| `text` | 600s | 20 | 4000 caracteres / 16 KB | Nao aplicavel |
| `audio` | 3600s | 8 | 7.5 MB decodificados | `audio/webm`, `audio/ogg`, `audio/wav`, `audio/mpeg`, `audio/mp4`, `audio/x-m4a` |
| `receipt` | 3600s | 12 | 6 MB decodificados | `image/webp`, `image/jpeg`, `image/png`, `image/heic`, `image/heif` |

## Variaveis da Edge Function

As variaveis abaixo sao opcionais. Se ausentes ou invalidas, a function usa os padroes acima.

```text
AI_TEXT_RATE_LIMIT
AI_TEXT_RATE_WINDOW_SECONDS
AI_TEXT_MAX_CHARS
AI_TEXT_MAX_BYTES
AI_AUDIO_RATE_LIMIT
AI_AUDIO_RATE_WINDOW_SECONDS
AI_AUDIO_MAX_BYTES
AI_RECEIPT_RATE_LIMIT
AI_RECEIPT_RATE_WINDOW_SECONDS
AI_RECEIPT_MAX_BYTES
```

Essas variaveis devem ser configuradas como secrets/config da Supabase Edge Function, nao como `VITE_*` no frontend.

## Persistencia e Auditoria

A migration `20260523100000_ai_extraction_rate_limits.sql` cria `public.ai_extraction_events`:

- `unidade_id`, `user_id`, `mode`, `payload_bytes`, `allowed`, `reason`, `created_at`;
- indice para contagem por `unidade_id/user_id/mode/created_at`;
- RLS permitindo que apenas admins aprovados registrem e leiam suas proprias tentativas da unidade;
- funcao `cleanup_ai_extraction_events` para reter eventos por 30 dias;
- agendamento `pg_cron` diario quando a extensao estiver disponivel.

## Comportamento

1. A function exige sessao Supabase e admin aprovado da unidade.
2. O payload e validado antes do Gemini.
3. Tentativas bloqueadas por tamanho, MIME ou janela de uso sao registradas com `allowed = false`.
4. Tentativas aceitas sao registradas com `allowed = true` antes da chamada ao Gemini.
5. O frontend preserva mensagens especificas de limite, formato ou tamanho para o usuario.

## Validacao

Comandos executados:

```powershell
npm run supabase:migrations:dry-run
npm run supabase:migrations:push
supabase functions deploy extract-inventory
npm run lint
npm test
```

Cobertura automatizada adicionada:

- caminho feliz para payload de cupom;
- bloqueio de MIME de audio invalido;
- bloqueio de texto acima do limite configurado;
- normalizacao de MIME com parametros e calculo de tamanho base64.
