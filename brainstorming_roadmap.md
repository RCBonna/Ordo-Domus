# 🧠 Brainstorming: Ordo Domus - Próximos Passos

Avaliando o estado atual do projeto e o histórico de conversas, aqui está uma análise técnica e funcional do que já conquistamos e do que falta para transformar o Ordo Domus em uma solução SaaS completa e "Premium".

## ✅ O que já está pronto (Baseline MVP)
*   **Autenticação Robusta**: Integração com Supabase (Login/Logout) e fluxo de sessão persistente.
*   **Estrutura Multi-Tenant**: Suporte a múltiplas Unidades com separação de dados via RLS.
*   **Interface Base**: Dashboard com abas (Entrada vs. Inventário) e design moderno usando Tailwind + Framer Motion.
*   **Inteligência Artificial (Gemini)**: Extração de produtos, quantidades, validades e locais a partir de texto livre.
*   **Inventário Funcional**: Pesquisa em tempo real com agrupamento por local e persistência via RPC (`upsert_inventario`).

---

## 🚀 Pontos de Melhoria (Onde elevar o nível)

### 1. Gestão de Dados (CRUD Completo)
Atualmente, o sistema foca em "Entrada". Para ser um gerenciador de inventário completo, precisamos de:
*   **Edição In-line**: Botão de editar diretamente no card do inventário para corrigir quantidades ou locais sem precisar de um novo comando de voz/texto.
*   **Baixa de Estoque (Saída)**: Uma aba ou modo "Consumo" para remover itens facilmente.
*   **Exclusão**: Funcionalidade para deletar itens inseridos incorretamente.

### 2. Experiência de Usuário (UX "Wow")
*   **Visualização de Validades**: Cards com bordas coloridas (Ex: Vermelho para itens vencidos, Amarelo para vencer em 30 dias).
*   **Gráficos e Insights**: Uma aba de "Dashboard" real com total de itens por local, valor estimado (se houver preço) e alertas de estoque baixo.
*   **Busca Global Aprimorada**: Filtros por categoria (Alimentos, Limpeza, Ferramentas) e ordenação por data de validade.

### 3. Poder de IA (Gemini+)
*   **Captura de Áudio Direta**: Integrar o `MediaRecorder` do navegador para que o usuário possa falar diretamente no app, sem precisar digitar.
*   **Processamento em Lote**: Permitir colar listas longas ou textos complexos e mostrar um "preview" para confirmação antes de salvar.

### 4. Administração (SaaS Ready)
*   **Gestão de Membros**: Interface para o Admin da unidade ver quem são os membros e remover acessos.
*   **Histórico de Auditoria**: Uma tabela de logs mostrando "Quem adicionou o quê e quando".
*   **Configurações da Unidade**: Trocar nome da unidade, definir locais padrão (Cozinha, Despensa, Garagem).

---

## 🗺️ Sugestão de Roadmap (Prioridades)

| Fase | Funcionalidade | Impacto |
| :--- | :--- | :--- |
| **P1** | **Edição e Exclusão** no Inventário | Operacional (Essencial) |
| **P2** | **Captura de Áudio Nativa** | Diferencial AI (Wow) |
| **P3** | **Alertas de Validade** | Utilidade Diária |
| **P4** | **Painel Administrativo** | Escala e Segurança |

---

### 💡 Pergunta para o Usuário:
O que você visualiza como a **maior dor** hoje ao usar o app? 
- É a dificuldade de corrigir algo que entrou errado?
- É a falta de saber o que está vencendo?
- Ou você gostaria de focar na parte de voz/áudio agora?

> [!NOTE]
> Este documento é um ponto de partida. Podemos detalhar qualquer um desses itens agora.
