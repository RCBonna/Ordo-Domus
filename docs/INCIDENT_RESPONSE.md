# Incident Response

## Indice

1. [Classificacao](#classificacao)
2. [Playbooks](#playbooks)
3. [Comunicacao](#comunicacao)
4. [Pos-Incidente](#pos-incidente)

## Classificacao

| Severidade | Exemplo |
| --- | --- |
| SEV-1 | Vazamento de dados, chave Gemini abusada, RLS quebrada. |
| SEV-2 | Login indisponivel, upsert falhando, perda de dados. |
| SEV-3 | Gemini instavel, cupom falhando, dashboard incorreto. |
| SEV-4 | Bug visual ou mensagem incorreta. |

## Playbooks

### Vazamento ou abuso da chave Gemini

1. Revogar chave no provedor.
2. Gerar nova chave.
3. Desabilitar temporariamente features de IA.
4. Mover chamadas para backend/Edge Function.
5. Revisar logs/custos.

### RLS permitindo acesso indevido

1. Ativar modo manutencao se necessario.
2. Revogar anon key se houver abuso ativo.
3. Corrigir policy em ambiente staging.
4. Aplicar migration em producao.
5. Executar queries de auditoria por `unidade_id`.

### RPC `upsert_inventario` falhando

1. Verificar erro no console/Supabase logs.
2. Validar existencia de colunas `deletado_em`, `deletado_por`.
3. Confirmar tabela correta `membros_unidades`.
4. Reaplicar migration consolidada.
5. Testar entrada manual.

### Gemini indisponivel

1. Confirmar status do provedor.
2. Reduzir fallbacks se causarem latencia excessiva.
3. Orientar uso manual temporario.
4. Registrar taxa de falha.

### Dados de inventario inconsistentes

1. Identificar unidade e item.
2. Consultar `movimentacoes_inventario`.
3. Restaurar quantidade manualmente com insert de `ajuste`.
4. Documentar causa raiz.

## Comunicacao

Template:

```text
Detectamos instabilidade em [area]. Impacto: [impacto]. 
Status atual: [mitigacao em andamento]. 
Proxima atualizacao: [horario].
```

## Pos-Incidente

Registrar:

- linha do tempo;
- causa raiz;
- impacto;
- dados afetados;
- correcoes aplicadas;
- acoes preventivas;
- testes adicionados.

