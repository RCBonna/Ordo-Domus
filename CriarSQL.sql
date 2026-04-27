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
-- Admin vê TODOS os membros (inclusive pendentes, para poder aprovar).
-- Membros comuns veem apenas os aprovados da sua unidade.
create policy "Ver membros da unidade"
  on membros_unidade for select
  using (
    user_id = auth.uid()
    OR
    unidade_id IN (
      SELECT unidade_id FROM membros_unidade
      WHERE user_id = auth.uid() AND papel = 'admin'
    )
  );

create policy "Inserir membros"
  on membros_unidade for insert
  with check (auth.uid() = user_id);

create policy "Admin atualiza membros"
  on membros_unidade for update
  using (unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and papel = 'admin'));

create policy "Admin deleta membros"
  on membros_unidade for delete
  using (unidade_id in (select unidade_id from membros_unidade where user_id = auth.uid() and papel = 'admin'));

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