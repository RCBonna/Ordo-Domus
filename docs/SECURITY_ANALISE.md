# Analise de Seguranca

## Indice

1. [Resumo Executivo de Seguranca](#resumo-executivo-de-seguranca)
2. [Autenticacao](#autenticacao)
3. [Autorizacao](#autorizacao)
4. [Secrets](#secrets)
5. [LGPD e Privacidade](#lgpd-e-privacidade)
6. [OWASP](#owasp)
7. [Riscos Criticos](#riscos-criticos)
8. [Recomendacoes](#recomendacoes)

## Resumo Executivo de Seguranca

O projeto tem uma base boa para multi-tenancy por usar Supabase Auth e RLS. Na auditoria inicial, o maior problema identificado era a chamada direta ao Gemini no frontend com `VITE_GEMINI_API_KEY`.

Status P0: o repositorio agora possui a Edge Function `supabase/functions/extract-inventory/index.ts` e o frontend chama `supabase.functions.invoke('extract-inventory')`. A correcao fica efetiva em producao apos configurar o secret `GEMINI_API_KEY`, fazer deploy da function e remover `VITE_GEMINI_API_KEY` dos ambientes de frontend.

Segundo ponto importante: a UI trata convidados como leitura, mas as policies consolidadas permitem que qualquer membro aprovado insira/atualize/delete itens. Se a regra de negocio for leitura para convidados, ha divergencia entre UI e banco.

## Autenticacao

Mecanismo:

- email/senha via Supabase Auth;
- sessao persistente no cliente;
- refresh automatico de token;
- logout global.

Riscos:

- sem MFA;
- sem politica de senha customizada no app;
- sem auditoria de login no dominio da aplicacao.

## Autorizacao

Pontos fortes:

- RLS habilitado nas tabelas principais;
- RPCs administrativas verificam `auth.uid()`;
- super-admin isolado em `system_admins`.

Pontos frageis:

| Fragilidade | Impacto |
| --- | --- |
| Convidado aprovado pode escrever pela RLS consolidada | Usuario pode burlar UI chamando Supabase diretamente. |
| Funcoes `SECURITY DEFINER` sem hardening de `search_path` | Risco de seguranca PostgreSQL em ambientes mais complexos. |
| Movimentacoes sem `user_id` | Auditoria incompleta. |
| Codigo de convite | UI copia `unidadeId`; tabela tem `codigo_convite`, mas fluxo nao usa claramente esse campo. |

## Secrets

Variaveis detectadas:

| Variavel | Uso | Risco |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL publica Supabase | Normalmente publico. |
| `VITE_SUPABASE_ANON_KEY` | Chave anon Supabase | Publica por desenho, depende de RLS correta. |
| `VITE_GEMINI_API_KEY` | Legado | Deve ser removida dos ambientes de frontend apos deploy da Edge Function. |
| `GEMINI_API_KEY` | Chave Gemini server-side | Deve ficar apenas como Supabase secret da Edge Function. |

Recomendacao: mover Gemini para Supabase Edge Function, Cloud Run ou outro backend server-side.

## LGPD e Privacidade

Dados pessoais/processados:

- email do usuario via Supabase Auth;
- UUID de usuario exibido parcialmente no painel admin;
- possivel PII em imagens de cupom fiscal, como CPF/endereco;
- inventario domestico, que pode revelar habitos de consumo.

Medidas positivas:

- imagem do cupom nao e persistida no banco;
- apenas itens extraidos sao salvos;
- dados isolados por unidade.

Lacunas:

- nao ha politica de retencao automatizada implementada para `importacoes_pendentes` expiradas;
- nao ha tela/exportacao/exclusao de dados pessoais;
- nao ha registro de consentimento para envio a Gemini;
- logs client-side sensiveis foram removidos/sanitizados em P2.4;
- observabilidade remota opcional via Sentry possui scrubber formal antes do envio de eventos e nao envia email do usuario para `setUser`.

## OWASP

| Categoria | Avaliacao |
| --- | --- |
| Broken Access Control | Risco medio/alto por divergencia convidado/RLS. |
| Cryptographic Failures | Baixo no app, pois auth/HTTPS dependem de Supabase/hospedagem. |
| Injection | Baixo nas chamadas SDK, medio em RPCs se futuras concatenarem SQL dinamico. |
| Insecure Design | Medio por IA client-side e falta de rate limit. |
| Security Misconfiguration | Medio por scripts SQL divergentes e secrets Vite. |
| Vulnerable Components | Depende de auditoria `npm audit`; nao analisada aqui. |
| Identification/Auth Failures | Medio por ausencia de MFA e politicas adicionais. |
| Logging/Monitoring Failures | Medio; observabilidade remota opcional foi adicionada, mas depende de DSN e alertas configurados no ambiente. |

## Riscos Criticos

1. **Exposicao da chave Gemini**
   - Severidade: Alta.
   - Mitigacao: backend/Edge Function com rate limit.

2. **RLS mais permissiva que UI**
   - Severidade: Alta se convidados devem ser read-only.
   - Mitigacao: policies separadas por `papel='admin'` para escrita.

3. **Migrations inconsistentes**
   - Severidade: Alta.
   - Mitigacao: consolidar schema e remover scripts obsoletos ou marca-los como historicos.

4. **Auditoria incompleta**
   - Severidade: Media.
   - Mitigacao: adicionar `user_id`, `origem`, `metadata`.

## Recomendacoes

1. Criar `supabase/functions/extract-inventory` para Gemini.
2. Aplicar rate limit por usuario/unidade.
3. Reescrever RLS:
   - leitura: membros aprovados;
   - escrita: admins ou papel configuravel;
   - guest: somente select.
4. Fixar `search_path` nas funcoes `SECURITY DEFINER`.
5. Adicionar checks:
   - `papel in ('admin','convidado')`
   - `status in ('pendente','aprovado')`
   - `tipo in ('entrada','consumo','ajuste','exclusao')`
6. Criar politica de privacidade e consentimento para IA.
7. Configurar DSN, alertas e ownership no Sentry por ambiente.
