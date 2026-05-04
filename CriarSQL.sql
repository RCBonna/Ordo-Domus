-- ==============================================================================
-- Ordo Domus - Script de Inicialização da Base de Dados
-- Data / hora da ultima correção: 02/05/2026 às 16:45:13
-- ==============================================================================

-- ==========================================
-- 1. CRIAÇÃO DAS TABELAS
-- ==========================================

-- TABELA 1: Unidades
create table unidades (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  codigo_convite text unique default gen_random_uuid()::text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABELA 2: Membros das Unidades (Pluralizado)
create table membros_unidades (
  unidade_id uuid references unidades(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  papel text default 'admin', -- 'admin' ou 'convidado'
  status text default 'pendente', -- 'pendente' ou 'aprovado'
  adicionado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (unidade_id, user_id)
);

-- Índices Membros
create index idx_membros_unidades_user_id on membros_unidades(user_id);
create index idx_membros_unidades_unidade_id on membros_unidades(unidade_id);
create index idx_membros_unidades_status on membros_unidades(status);

-- TABELA 3: Itens do Inventário
create table itens_inventario (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references unidades(id) on delete cascade not null,
  nome text not null,
  categoria text,
  comodo text not null,
  armario text,
  caixa text,
  validade text,
  quantidade numeric default 1,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  deletado_em timestamptz, -- Soft delete
  deletado_por uuid references auth.users
);

-- Índices Inventário
create index idx_itens_unidade_id on itens_inventario(unidade_id);
create index idx_itens_categoria on itens_inventario(categoria);

-- TABELA 4: Movimentações (Auditoria)
create table movimentacoes_inventario (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references unidades(id) on delete cascade not null,
  item_id uuid, -- Referência opcional (pode ser nulo se o item for excluído)
  item_nome text not null,
  categoria text,
  comodo text,
  quantidade numeric default 1,
  tipo text not null, -- 'entrada', 'consumo', 'ajuste', 'exclusao'
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices Auditoria
create index idx_movimentacoes_unidade_id on movimentacoes_inventario(unidade_id);
create index idx_movimentacoes_criado_em on movimentacoes_inventario(criado_em);

-- View para exposição anônima de membros
create view membros_unidades_view as
select 
  m.unidade_id,
  m.papel,
  m.status,
  m.adicionado_em,
  encode(sha256(m.user_id::text::bytea), 'hex') as user_hash
from membros_unidades m;

-- ==========================================
-- 2. OTIMIZAÇÕES E CONSTRAINTS
-- ==========================================

-- Índices funcionais para busca case-insensitive
create index idx_itens_unidade_nome_lower on itens_inventario (unidade_id, lower(trim(nome)));
create index idx_itens_unidade_comodo_lower on itens_inventario (unidade_id, lower(trim(comodo)));

-- Índice composto para a busca exata no RPC
create index idx_itens_upsert_lookup on itens_inventario (
  unidade_id, 
  lower(trim(nome)), 
  lower(trim(comodo)), 
  lower(trim(armario)), 
  lower(trim(caixa)), 
  validade
) where deletado_em is null;

-- Constraint de unicidade para evitar duplicatas reais
alter table itens_inventario 
add constraint unique_item_location 
unique (unidade_id, nome, comodo, armario, caixa, validade);

-- ==========================================
-- 3. RLS POLICIES (SEGURANÇA)
-- ==========================================

alter table unidades enable row level security;
alter table membros_unidades enable row level security;
alter table itens_inventario enable row level security;
alter table movimentacoes_inventario enable row level security;
alter table membros_unidades_view enable row level security;

-- POLICIES PARA unidades
drop policy if exists "Permitir inserção de unidades para usuários autenticados" on unidades;
create policy "Permitir inserção de unidades para usuários autenticados"
  on unidades for insert
  to authenticated
  with check (true);

drop policy if exists "Permitir leitura de unidades que o usuário é membro" on unidades;
create policy "Permitir leitura de unidades que o usuário é membro"
  on unidades for select
  using (
    id in (select unidade_id from membros_unidades where user_id = auth.uid())
  );

-- POLICIES PARA membros_unidades
drop policy if exists "Ver membros da unidade" on membros_unidades;
create policy "Ver membros da unidade"
  on membros_unidades for select
  using (user_id = auth.uid());

drop policy if exists "Inserir membros" on membros_unidades;
create policy "Inserir membros"
  on membros_unidades for insert
  with check (auth.uid() = user_id);

-- POLICIES PARA itens_inventario
drop policy if exists "Leitura para membros aprovados" on itens_inventario;
create policy "Leitura para membros aprovados"
  on itens_inventario for select
  using (
    deletado_em is null AND
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );

drop policy if exists "Qualquer membro aprovado insere" on itens_inventario;
create policy "Qualquer membro aprovado insere"
  on itens_inventario for insert
  with check (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );

-- POLICIES PARA movimentacoes_inventario
drop policy if exists "Leitura para membros aprovados mov" on movimentacoes_inventario;
create policy "Leitura para membros aprovados mov"
  on movimentacoes_inventario for select
  using (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );

drop policy if exists "Inserir movimentacoes" on movimentacoes_inventario;
create policy "Inserir movimentacoes"
  on movimentacoes_inventario for insert
  with check (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );

-- ==========================================
-- 4. FUNÇÕES RPC (LÓGICA DE NEGÓCIO)
-- ==========================================

-- Função de Upsert Determinístico (Evita Duplicatas)
CREATE OR REPLACE FUNCTION upsert_inventario(
  p_unidade_id UUID,
  p_nome TEXT,
  p_categoria TEXT,
  p_comodo TEXT,
  p_armario TEXT DEFAULT '',
  p_caixa TEXT DEFAULT '',
  p_quantidade NUMERIC DEFAULT 1,
  p_validade TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n_nome TEXT := lower(trim(COALESCE(p_nome, '')));
  n_comodo TEXT := lower(trim(COALESCE(p_comodo, '')));
  n_armario TEXT := lower(trim(COALESCE(p_armario, '')));
  n_caixa TEXT := lower(trim(COALESCE(p_caixa, '')));
  v_quantidade NUMERIC := COALESCE(p_quantidade, 1);
  v_existing_id UUID;
  v_existing_qty NUMERIC;
  v_result RECORD;
  v_acao TEXT := 'ADD';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidades
    WHERE unidade_id = p_unidade_id
    AND user_id = auth.uid()
    AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT id, quantidade INTO v_existing_id, v_existing_qty
  FROM itens_inventario
  WHERE unidade_id = p_unidade_id
    AND lower(trim(COALESCE(nome, ''))) = n_nome
    AND lower(trim(COALESCE(comodo, ''))) = n_comodo
    AND lower(trim(COALESCE(armario, ''))) = n_armario
    AND lower(trim(COALESCE(caixa, ''))) = n_caixa
    AND COALESCE(validade, '') = trim(COALESCE(p_validade, ''))
    AND deletado_em IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE itens_inventario SET quantidade = v_existing_qty + v_quantidade WHERE id = v_existing_id RETURNING * INTO v_result;
    v_acao := 'MERGE';
  ELSE
    INSERT INTO itens_inventario (unidade_id, nome, categoria, comodo, armario, caixa, quantidade, validade)
    VALUES (p_unidade_id, trim(p_nome), trim(p_categoria), trim(p_comodo), trim(p_armario), trim(p_caixa), v_quantidade, NULLIF(trim(p_validade), ''))
    RETURNING * INTO v_result;
    v_acao := 'ADD';
  END IF;

  RETURN json_build_object('acao', v_acao, 'id', v_result.id, 'nome', v_result.nome, 'quantidade', v_result.quantidade);
END;
$$;

-- Função para admin listar pendentes
CREATE OR REPLACE FUNCTION listar_pendentes(p_unidade_id UUID)
RETURNS TABLE (
  unidade_id UUID,
  user_id UUID,
  papel TEXT,
  status TEXT,
  adicionado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidades m
    WHERE m.unidade_id = p_unidade_id
    AND m.user_id = auth.uid()
    AND m.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem listar pendentes.';
  END IF;

  RETURN QUERY
    SELECT m.unidade_id, m.user_id, m.papel, m.status, m.adicionado_em
    FROM membros_unidades m
    WHERE m.unidade_id = p_unidade_id
    AND m.status = 'pendente';
END;
$$;

-- Função para admin aprovar membro
CREATE OR REPLACE FUNCTION aprovar_membro(p_unidade_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidades m
    WHERE m.unidade_id = p_unidade_id
    AND m.user_id = auth.uid()
    AND m.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE membros_unidades
  SET status = 'aprovado'
  WHERE unidade_id = p_unidade_id
  AND user_id = p_user_id;
END;
$$;

-- Função para admin rejeitar membro
CREATE OR REPLACE FUNCTION rejeitar_membro(p_unidade_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidades m
    WHERE m.unidade_id = p_unidade_id
    AND m.user_id = auth.uid()
    AND m.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  DELETE FROM membros_unidades
  WHERE unidade_id = p_unidade_id
  AND user_id = p_user_id;
END;
$$;

-- ==========================================
-- 5. IMPORTAÇÃO DE CUPOM FISCAL (OCR)
-- ==========================================

-- TABELA: Importações Pendentes (Triagem)
create table if not exists importacoes_pendentes (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references unidades(id) on delete cascade not null,
  nome_bruto text not null,
  quantidade numeric default 1,
  valor_unitario numeric,
  match_id uuid references itens_inventario(id) on delete set null, -- Preenchido se a IA / sistema fizer match automático
  processado boolean default false,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '24 hours') not null
);

-- Índices Importações Pendentes
create index if not exists idx_importacoes_pendentes_unidade_id on importacoes_pendentes(unidade_id);
create index if not exists idx_importacoes_pendentes_expires_at on importacoes_pendentes(expires_at);

-- TABELA: Dicionário de Produtos (Smart Match)
create table if not exists dicionario_produtos (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references unidades(id) on delete cascade not null,
  nome_bruto_cupom text not null,
  nome_oficial_inventario text not null, -- Como o usuário gosta de chamar
  categoria text,
  comodo text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(unidade_id, nome_bruto_cupom)
);

-- Índices Dicionário
create index if not exists idx_dicionario_unidade_nome on dicionario_produtos(unidade_id, lower(trim(nome_bruto_cupom)));

-- ==========================================
-- RLS POLICIES (Importação e Dicionário)
-- ==========================================

alter table importacoes_pendentes enable row level security;
alter table dicionario_produtos enable row level security;

-- POLICIES PARA importacoes_pendentes
drop policy if exists "Membros aprovados gerenciam importacoes" on importacoes_pendentes;
create policy "Membros aprovados gerenciam importacoes"
  on importacoes_pendentes for all
  using (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  )
  with check (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );

-- POLICIES PARA dicionario_produtos
drop policy if exists "Membros aprovados gerenciam dicionario" on dicionario_produtos;
create policy "Membros aprovados gerenciam dicionario"
  on dicionario_produtos for all
  using (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  )
  with check (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );