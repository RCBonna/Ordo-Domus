-- ==========================================
-- 1. CRIAÇÃO DAS TABELAS (VERSÃO CORRIGIDA)
-- ==========================================

-- TABELA 1: Unidades
create table unidades (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  codigo_convite text unique default gen_random_uuid()::text, -- NOVO
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABELA 2: Membros da Unidade
create table membros_unidade (
  unidade_id uuid references unidades(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  papel text default 'admin', -- 'admin' ou 'convidado'
  status text default 'pendente', -- 'pendente' ou 'aprovado'
  adicionado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (unidade_id, user_id)
);

-- Índices
create index idx_membros_unidade_user_id on membros_unidade(user_id);
create index idx_membros_unidade_unidade_id on membros_unidade(unidade_id);
create index idx_membros_unidade_status on membros_unidade(status);

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

-- View para exposição anônima de membros
create view membros_unidade_view as
select 
  m.unidade_id,
  m.papel,
  m.status,
  m.adicionado_em,
  encode(sha256(m.user_id::text::bytea), 'hex') as user_hash -- Hash anônimo
from membros_unidade m;

-- Índices
create index idx_itens_unidade_id on itens_inventario(unidade_id);
create index idx_itens_categoria on itens_inventario(categoria);

-- Constraint de unicidade para evitar duplicatas
alter table itens_inventario 
add constraint unique_item_location 
unique (unidade_id, nome, comodo, armario, caixa, validade);

-- ==========================================
-- 2. RLS POLICIES CORRIGIDAS
-- ==========================================

alter table unidades enable row level security;
alter table membros_unidade enable row level security;
alter table itens_inventario enable row level security;
alter table membros_unidade_view enable row level security;

-- POLICIES PARA unidades
create policy "Ver próprias unidades"
  on unidades for select
  using (id in (select unidade_id from membros_unidade where user_id = auth.uid() and status = 'aprovado'));

create policy "Criar novas unidades"
  on unidades for insert
  with check (auth.uid() is not null);

create policy "Admin atualiza unidade"
  on unidades for update
  using (id in (select unidade_id from membros_unidade where user_id = auth.uid() and papel = 'admin'));

create policy "Admin deleta unidade"
  on unidades for delete
  using (id in (select unidade_id from membros_unidade where user_id = auth.uid() and papel = 'admin'));

-- POLICIES PARA membros_unidade (uso interno)
-- Cada usuário vê seus próprios registros (qualquer status).
-- Admins veem todos os membros via função SECURITY DEFINER separada (sem recursão).
create policy "Ver membros da unidade"
  on membros_unidade for select
  using (user_id = auth.uid());

create policy "Inserir membros"
  on membros_unidade for insert
  with check (auth.uid() = user_id);

-- UPDATE e DELETE de membros são feitos via funções SECURITY DEFINER
-- (aprovar_membro e rejeitar_membro) para evitar recursão RLS.

-- POLICIES PARA itens_inventario
create policy "Leitura para membros aprovados"
  on itens_inventario for select
  using (
    deletado_em is null AND
    unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and status = 'aprovado')
  );

create policy "Qualquer membro aprovado insere"
  on itens_inventario for insert
  with check (
    unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and status = 'aprovado')
  );

create policy "Convidado só atualiza quantidade"
  on itens_inventario for update
  using (
    deletado_em is null AND
    unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and status = 'aprovado')
  )
  with check (
    (select papel from membros_unidade where user_id = auth.uid() and unidade_id = itens_inventario.unidade_id) = 'admin'
    OR
    (OLD.nome = NEW.nome AND OLD.categoria = NEW.categoria AND OLD.comodo = NEW.comodo AND OLD.armario = NEW.armario)
  );

create policy "Admin deleta ou soft delete"
  on itens_inventario for update
  using (
    unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and papel = 'admin')
  );

create policy "Admin hard delete"
  on itens_inventario for delete
  using (
    unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and papel = 'admin')
  );

-- POLICIES PARA view (apenas leitura, dados anônimos)
create policy "Ver membros anônimos"
  on membros_unidade_view for select
  using (
    unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid())
  );

-- ==========================================
-- 3. FUNÇÃO DE UPSERT DETERMINÍSTICO
-- ==========================================
-- Substitui a 2ª chamada à IA Gemini por lógica de banco.
-- Se o item já existe no mesmo local → soma quantidade.
-- Se não existe → insere novo registro.

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
  n_validade TEXT := trim(COALESCE(p_validade, ''));
  v_quantidade NUMERIC := COALESCE(p_quantidade, 1);
  v_existing_id UUID;
  v_existing_qty NUMERIC;
  v_result RECORD;
  v_acao TEXT := 'ADD';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidade
    WHERE unidade_id = p_unidade_id
    AND user_id = auth.uid()
    AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não é membro aprovado desta unidade.';
  END IF;

  SELECT id, quantidade INTO v_existing_id, v_existing_qty
  FROM itens_inventario
  WHERE unidade_id = p_unidade_id
    AND lower(trim(COALESCE(nome, ''))) = n_nome
    AND lower(trim(COALESCE(comodo, ''))) = n_comodo
    AND lower(trim(COALESCE(armario, ''))) = n_armario
    AND lower(trim(COALESCE(caixa, ''))) = n_caixa
    AND COALESCE(validade, '') = n_validade
    AND deletado_em IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE itens_inventario
    SET quantidade = v_existing_qty + v_quantidade
    WHERE id = v_existing_id
    RETURNING * INTO v_result;
    v_acao := 'MERGE';
  ELSE
    INSERT INTO itens_inventario (unidade_id, nome, categoria, comodo, armario, caixa, quantidade, validade)
    VALUES (
      p_unidade_id,
      trim(COALESCE(p_nome, '')),
      trim(COALESCE(p_categoria, '')),
      trim(COALESCE(p_comodo, '')),
      trim(COALESCE(p_armario, '')),
      trim(COALESCE(p_caixa, '')),
      v_quantidade,
      NULLIF(trim(COALESCE(p_validade, '')), '')
    )
    RETURNING * INTO v_result;
    v_acao := 'ADD';
  END IF;

  RETURN json_build_object(
    'acao', v_acao,
    'id', v_result.id,
    'nome', v_result.nome,
    'categoria', v_result.categoria,
    'comodo', v_result.comodo,
    'armario', v_result.armario,
    'caixa', v_result.caixa,
    'validade', COALESCE(v_result.validade, ''),
    'quantidade', v_result.quantidade
  );
END;
$$;