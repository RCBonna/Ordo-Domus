-- P0 hardening: enforce role-based RLS and harden SECURITY DEFINER RPCs.
-- Business rule enforced here:
-- - approved members can read unit data;
-- - only approved admins can write inventory, movements, pending imports and product dictionary;
-- - admin RPCs require admin role and approved status.

alter table if exists public.unidades enable row level security;
alter table if exists public.membros_unidades enable row level security;
alter table if exists public.itens_inventario enable row level security;
alter table if exists public.movimentacoes_inventario enable row level security;
alter table if exists public.importacoes_pendentes enable row level security;
alter table if exists public.dicionario_produtos enable row level security;
alter table if exists public.system_admins enable row level security;

drop policy if exists "Leitura para membros aprovados" on public.itens_inventario;
drop policy if exists "Qualquer membro aprovado insere" on public.itens_inventario;
drop policy if exists "Membros aprovados atualizam" on public.itens_inventario;
drop policy if exists "Membros aprovados deletam" on public.itens_inventario;
drop policy if exists "Admins inserem itens" on public.itens_inventario;
drop policy if exists "Admins atualizam itens" on public.itens_inventario;
drop policy if exists "Admins deletam itens" on public.itens_inventario;

create policy "Leitura para membros aprovados"
  on public.itens_inventario for select
  using (
    deletado_em is null
    and exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = itens_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
    )
  );

create policy "Admins inserem itens"
  on public.itens_inventario for insert
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = itens_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

create policy "Admins atualizam itens"
  on public.itens_inventario for update
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = itens_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = itens_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

create policy "Admins deletam itens"
  on public.itens_inventario for delete
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = itens_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

drop policy if exists "Leitura para membros aprovados mov" on public.movimentacoes_inventario;
drop policy if exists "Inserir movimentacoes" on public.movimentacoes_inventario;
drop policy if exists "Admins inserem movimentacoes" on public.movimentacoes_inventario;

create policy "Leitura para membros aprovados mov"
  on public.movimentacoes_inventario for select
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = movimentacoes_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
    )
  );

create policy "Admins inserem movimentacoes"
  on public.movimentacoes_inventario for insert
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = movimentacoes_inventario.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

drop policy if exists "Membros aprovados gerenciam importacoes" on public.importacoes_pendentes;
drop policy if exists "Admins gerenciam importacoes" on public.importacoes_pendentes;

create policy "Admins gerenciam importacoes"
  on public.importacoes_pendentes for all
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = importacoes_pendentes.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = importacoes_pendentes.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

drop policy if exists "Membros aprovados gerenciam dicionario" on public.dicionario_produtos;
drop policy if exists "Admins gerenciam dicionario" on public.dicionario_produtos;

create policy "Admins gerenciam dicionario"
  on public.dicionario_produtos for all
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = dicionario_produtos.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = dicionario_produtos.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

create or replace function public.upsert_inventario(
  p_unidade_id uuid,
  p_nome text,
  p_categoria text,
  p_comodo text,
  p_armario text default '',
  p_caixa text default '',
  p_quantidade numeric default 1,
  p_validade text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  n_nome text := lower(trim(coalesce(p_nome, '')));
  n_comodo text := lower(trim(coalesce(p_comodo, '')));
  n_armario text := lower(trim(coalesce(p_armario, '')));
  n_caixa text := lower(trim(coalesce(p_caixa, '')));
  n_validade text := trim(coalesce(p_validade, ''));
  v_quantidade numeric := coalesce(p_quantidade, 1);
  v_existing_id uuid;
  v_existing_qty numeric;
  v_result record;
  v_acao text := 'ADD';
begin
  if not exists (
    select 1
    from public.membros_unidades
    where unidade_id = p_unidade_id
      and user_id = auth.uid()
      and status = 'aprovado'
      and papel = 'admin'
  ) then
    raise exception 'Acesso negado: somente administradores aprovados podem alterar o inventario.';
  end if;

  select id, quantidade
    into v_existing_id, v_existing_qty
  from public.itens_inventario
  where unidade_id = p_unidade_id
    and lower(trim(coalesce(nome, ''))) = n_nome
    and lower(trim(coalesce(comodo, ''))) = n_comodo
    and lower(trim(coalesce(armario, ''))) = n_armario
    and lower(trim(coalesce(caixa, ''))) = n_caixa
    and coalesce(validade, '') = n_validade
    and deletado_em is null
  limit 1;

  if v_existing_id is not null then
    update public.itens_inventario
       set quantidade = v_existing_qty + v_quantidade
     where id = v_existing_id
     returning * into v_result;
    v_acao := 'MERGE';
  else
    insert into public.itens_inventario (
      unidade_id,
      nome,
      categoria,
      comodo,
      armario,
      caixa,
      quantidade,
      validade
    )
    values (
      p_unidade_id,
      trim(coalesce(p_nome, '')),
      trim(coalesce(p_categoria, '')),
      trim(coalesce(p_comodo, '')),
      trim(coalesce(p_armario, '')),
      trim(coalesce(p_caixa, '')),
      v_quantidade,
      nullif(trim(coalesce(p_validade, '')), '')
    )
    returning * into v_result;
    v_acao := 'ADD';
  end if;

  return json_build_object(
    'acao', v_acao,
    'id', v_result.id,
    'nome', v_result.nome,
    'categoria', v_result.categoria,
    'comodo', v_result.comodo,
    'armario', v_result.armario,
    'caixa', v_result.caixa,
    'validade', coalesce(v_result.validade, ''),
    'quantidade', v_result.quantidade
  );
end;
$$;

create or replace function public.listar_pendentes(p_unidade_id uuid)
returns table (
  unidade_id uuid,
  user_id uuid,
  papel text,
  status text,
  adicionado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.papel = 'admin'
      and m.status = 'aprovado'
  ) then
    raise exception 'Acesso negado: somente administradores aprovados podem listar pendentes.';
  end if;

  return query
    select m.unidade_id, m.user_id, m.papel, m.status, m.adicionado_em
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.status = 'pendente';
end;
$$;

create or replace function public.listar_membros(p_unidade_id uuid)
returns table (
  unidade_id uuid,
  user_id uuid,
  papel text,
  status text,
  adicionado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.papel = 'admin'
      and m.status = 'aprovado'
  ) then
    raise exception 'Acesso negado: somente administradores aprovados podem listar membros.';
  end if;

  return query
    select m.unidade_id, m.user_id, m.papel, m.status, m.adicionado_em
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id;
end;
$$;

create or replace function public.aprovar_membro(p_unidade_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.papel = 'admin'
      and m.status = 'aprovado'
  ) then
    raise exception 'Acesso negado.';
  end if;

  update public.membros_unidades
     set status = 'aprovado'
   where unidade_id = p_unidade_id
     and user_id = p_user_id;
end;
$$;

create or replace function public.rejeitar_membro(p_unidade_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.papel = 'admin'
      and m.status = 'aprovado'
  ) then
    raise exception 'Acesso negado.';
  end if;

  delete from public.membros_unidades
   where unidade_id = p_unidade_id
     and user_id = p_user_id;
end;
$$;

create or replace function public.is_system_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.system_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.get_saas_metrics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_unidades int;
  v_total_usuarios_distintos int;
  v_total_itens int;
  v_total_convites_pendentes int;
begin
  if not public.is_system_admin() then
    raise exception 'Acesso negado: apenas administradores do sistema podem ver metricas globais.';
  end if;

  select count(*) into v_total_unidades from public.unidades;
  select count(distinct user_id) into v_total_usuarios_distintos from public.membros_unidades;
  select count(*) into v_total_itens from public.itens_inventario where deletado_em is null;
  select count(*) into v_total_convites_pendentes from public.membros_unidades where status = 'pendente';

  return json_build_object(
    'total_unidades', v_total_unidades,
    'total_usuarios', v_total_usuarios_distintos,
    'total_itens', v_total_itens,
    'total_convites_pendentes', v_total_convites_pendentes
  );
end;
$$;
