# Especificacao de Requisitos

## Indice

1. [Escopo](#escopo)
2. [Requisitos Funcionais](#requisitos-funcionais)
3. [Requisitos Nao Funcionais](#requisitos-nao-funcionais)
4. [Requisitos Tecnicos](#requisitos-tecnicos)
5. [Dependencias Externas](#dependencias-externas)
6. [Premissas](#premissas)
7. [Restricoes](#restricoes)

## Escopo

Sistema web para controle de inventario por unidade, com entrada assistida por IA, governanca de membros, dashboard e auditoria operacional.

## Requisitos Funcionais

| ID | Requisito | Status |
| --- | --- | --- |
| RF-001 | Usuario deve criar conta por email/senha. | Implementado |
| RF-002 | Usuario deve fazer login/logout. | Implementado |
| RF-003 | Usuario deve criar unidade. | Implementado |
| RF-004 | Criador deve virar admin aprovado. | Implementado |
| RF-005 | Usuario deve solicitar acesso a unidade existente. | Implementado |
| RF-006 | Admin deve aprovar/rejeitar membros. | Implementado |
| RF-007 | Admin deve cadastrar item por texto livre. | Implementado |
| RF-008 | Admin deve cadastrar item por voz. | Implementado |
| RF-009 | Admin deve importar cupom por imagem. | Implementado |
| RF-010 | Sistema deve triagem de itens de cupom. | Implementado |
| RF-011 | Sistema deve memorizar mapeamentos de cupom. | Implementado |
| RF-012 | Sistema deve somar item equivalente. | Implementado via RPC |
| RF-013 | Usuario deve editar item. | Implementado |
| RF-014 | Usuario deve excluir item com auditoria. | Implementado |
| RF-015 | Usuario deve consumir item. | Implementado |
| RF-016 | Usuario deve desfazer consumo recente. | Implementado |
| RF-017 | Convidado deve ver inventario em leitura. | Implementado na UI |
| RF-018 | Sistema deve exibir dashboard. | Implementado |
| RF-019 | Super-admin deve ver metricas globais. | Implementado |

## Requisitos Nao Funcionais

| ID | Requisito | Status/Risco |
| --- | --- | --- |
| RNF-001 | Isolamento multi-tenant por unidade. | Implementado por RLS, revisar convidados. |
| RNF-002 | Baixa latencia em inventario domestico. | Adequado para MVP. |
| RNF-003 | Alta disponibilidade. | Dependente de Supabase/Gemini/hospedagem. |
| RNF-004 | Privacidade de cupom fiscal. | Imagem nao persistida; consentimento local de IA implementado. |
| RNF-005 | Auditabilidade de alteracoes. | Parcial; falta `user_id` na movimentacao. |
| RNF-006 | Manutenibilidade. | Media; precisa tipos e migrations. |
| RNF-007 | Testabilidade. | Baixa; sem testes. |
| RNF-008 | Seguranca de secrets. | Baixa para Gemini no cliente. |

## Requisitos Tecnicos

| ID | Requisito |
| --- | --- |
| RT-001 | Node.js e npm para build local. |
| RT-002 | Projeto Supabase com Auth, tabelas, RLS e RPCs. |
| RT-003 | Chaves publicas Supabase no ambiente. |
| RT-004 | Chave Gemini no ambiente atual. |
| RT-005 | Browser com suporte a MediaRecorder para voz. |
| RT-006 | Browser com Canvas API para compressao de imagem. |

## Dependencias Externas

- Supabase Auth.
- Supabase PostgreSQL/PostgREST/RPC.
- Gemini API.
- Browser APIs: `MediaRecorder`, `getUserMedia`, `FileReader`, Canvas, Clipboard.
- Hospedagem Vite estatico.

## Premissas

1. Usuarios autenticados possuem email validado conforme politica Supabase.
2. RLS esta corretamente aplicada em producao.
3. Itens por unidade cabem inicialmente em carregamento client-side.
4. O usuario revisa dados extraidos pela IA antes de persistir.
5. Cupom fiscal nao precisa ser armazenado como prova documental.
6. Consentimento local no navegador e suficiente para o MVP; registro auditavel server-side fica para politica de privacidade formal.

## Restricoes

1. Sem backend proprio hoje.
2. Sem migrations versionadas formais.
3. Sem testes automatizados.
4. Chamadas Gemini expostas no cliente.
5. `validade` armazenada como texto.
6. Sem observabilidade remota.
