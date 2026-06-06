-- Issue #24: expose human-readable member identity through governed RPCs.

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function public.set_updated_at_perfis()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_perfis on public.perfis;
create trigger set_updated_at_perfis
before update on public.perfis
for each row
execute function public.set_updated_at_perfis();

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  v_nome := nullif(trim(coalesce(
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name'
  )), '');

  insert into public.perfis (id, nome, email)
  values (new.id, v_nome, new.email)
  on conflict (id) do update
     set email = excluded.email,
         nome = coalesce(public.perfis.nome, excluded.nome);

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_auth_user_profile();

insert into public.perfis (id, nome, email)
select
  u.id,
  nullif(trim(coalesce(
    u.raw_user_meta_data->>'nome',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name'
  )), ''),
  u.email
from auth.users u
on conflict (id) do update
   set email = excluded.email,
       nome = coalesce(public.perfis.nome, excluded.nome);

alter table public.perfis enable row level security;

drop policy if exists "Usuario le proprio perfil" on public.perfis;
create policy "Usuario le proprio perfil"
  on public.perfis for select
  using (id = auth.uid());

drop policy if exists "Usuario atualiza proprio perfil" on public.perfis;
create policy "Usuario atualiza proprio perfil"
  on public.perfis for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Usuario cria proprio perfil" on public.perfis;
create policy "Usuario cria proprio perfil"
  on public.perfis for insert
  with check (id = auth.uid());

grant select, insert, update on public.perfis to authenticated;

drop function if exists public.listar_pendentes(uuid);
create function public.listar_pendentes(p_unidade_id uuid)
returns table (
  unidade_id uuid,
  user_id uuid,
  papel text,
  status text,
  adicionado_em timestamptz,
  nome text,
  email text
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
    select
      m.unidade_id,
      m.user_id,
      m.papel,
      m.status,
      m.adicionado_em,
      p.nome,
      p.email
    from public.membros_unidades m
    left join public.perfis p on p.id = m.user_id
    where m.unidade_id = p_unidade_id
      and m.status = 'pendente'
    order by m.adicionado_em desc;
end;
$$;

drop function if exists public.listar_membros(uuid);
create function public.listar_membros(p_unidade_id uuid)
returns table (
  unidade_id uuid,
  user_id uuid,
  papel text,
  status text,
  adicionado_em timestamptz,
  nome text,
  email text
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
    select
      m.unidade_id,
      m.user_id,
      m.papel,
      m.status,
      m.adicionado_em,
      p.nome,
      p.email
    from public.membros_unidades m
    left join public.perfis p on p.id = m.user_id
    where m.unidade_id = p_unidade_id
    order by coalesce(nullif(p.nome, ''), nullif(p.email, ''), m.user_id::text), m.adicionado_em;
end;
$$;
