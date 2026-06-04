# Consentimento e Privacidade para IA

Status operacional: implementado no frontend em 2026-05-23.

## Objetivo

Deixar explicito, antes do primeiro uso de IA, que texto, audio ou imagem de cupom podem ser enviados para processamento pela Edge Function autenticada `extract-inventory` e pelo provedor de IA configurado no backend.

## Superficie Coberta

| Fluxo | Dado enviado antes da IA | Persistencia bruta |
| --- | --- | --- |
| Entrada por texto | Texto digitado pelo usuario | Nao persistido automaticamente; dados estruturados sao persistidos somente apos confirmacao. |
| Entrada por audio | Audio gravado convertido para Base64 | Audio bruto nao e salvo no banco; dados estruturados sao persistidos somente apos confirmacao. |
| Importacao de cupom | Imagem comprimida no navegador e convertida para Base64 | Imagem bruta nao e salva no banco; itens extraidos ficam em triagem. |

## Implementacao

Arquivos:

```text
src/hooks/useAiConsent.ts
src/components/AiConsentModal.tsx
src/hooks/useExtraction.ts
src/hooks/useReceiptImport.ts
src/OrdoDomus.tsx
```

Comportamento:

- `useAiConsent` persiste o aceite em `localStorage`.
- A chave de persistencia inclui o usuario autenticado quando `currentUserEmail` esta disponivel.
- O modal bloqueia a chamada de IA ate o usuario aceitar.
- Recusa ou fechamento cancela somente a acao atual.
- Texto, audio e cupom compartilham o mesmo aceite porque usam a mesma superficie de processamento de IA.

Chave local:

```text
ordo_domus_ai_consent_v1:<email-normalizado>
```

## Retencao

- A imagem de cupom e comprimida no navegador e enviada para extracao; nao e persistida como arquivo.
- O audio e enviado para transcricao/extracao; nao e persistido como arquivo.
- O texto digitado nao e persistido automaticamente.
- Dados estruturados confirmados pelo usuario entram em inventario e historico.
- Itens extraidos de cupom entram em `importacoes_pendentes` para triagem.
- Hashes de cupom podem ser persistidos para detectar reimportacao.

## Limites

- O aceite local nao e auditoria juridica server-side.
- Limpeza de consentimento acontece ao limpar dados do navegador.
- Uma futura politica de privacidade formal deve definir controlador, operador, base legal, prazo de retencao e canal de exclusao/exportacao.

## Validacao

Comandos executados:

```powershell
npm run lint
npm run test:e2e:seed
npm run test:e2e
```
