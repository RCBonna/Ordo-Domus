# Debitos Tecnicos

## Indice

1. [Debitos Criticos](#debitos-criticos)
2. [Debitos de Codigo](#debitos-de-codigo)
3. [Debitos de Banco](#debitos-de-banco)
4. [Debitos de Produto](#debitos-de-produto)
5. [Plano de Saneamento](#plano-de-saneamento)

## Debitos Criticos

| Debito | Impacto | Acao |
| --- | --- | --- |
| Gemini no cliente | Exposicao de segredo e custo | Edge Function. |
| SQL divergente singular/plural | Migrations quebradas | Consolidar e arquivar scripts antigos. |
| Sem testes | Regressao alta | Vitest + Playwright + RLS tests. |
| RLS nao diferencia papel na escrita | Convidado pode escrever via API | Policies por papel. |

## Debitos de Codigo

- Uso extensivo de `any`.
- `OrdoDomus.tsx` com muitas responsabilidades.
- Duas copias de `supabaseClient` (`src/supabaseClient.ts` e `src/lib/supabaseClient.ts`).
- Dependencias possivelmente nao usadas: `express`, `dotenv`, `@base-ui/react`.
- Tipo `activeTab` inclui `consumo`, mas fluxo usa `inventario` + flag.
- Logs `console` muito verbosos para producao.

## Debitos de Banco

- `validade` como `text`.
- Sem checks em enums logicos.
- `movimentacoes_inventario` sem autor.
- `codigo_convite` nao alinhado ao fluxo de UI, que copia `unidadeId`.
- `expires_at` de importacoes pendentes sem rotina de limpeza.

## Debitos de Produto

- Sem recuperacao de senha customizada na UI.
- Sem gestao de nome/configuracoes da unidade.
- Sem exportacao/importacao de inventario.
- Sem notificacoes proativas.
- Sem tela de privacidade/consentimento IA.

## Plano de Saneamento

1. Semana 1: secrets, RLS por papel, migrations.
2. Semana 2: tipos Supabase e cleanup de dependencias.
3. Semana 3: testes unitarios/integracao.
4. Semana 4: Playwright e observabilidade.
5. Semana 5: melhorias de produto em triagem e validade.

