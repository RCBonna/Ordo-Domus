-- Issue #21: SaaS admin drill-downs for units, users, inventory and pending invites.

create or replace function public.get_saas_admin_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Acesso negado: apenas administradores do sistema podem ver dados globais.';
  end if;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_unidades', (select count(*) from public.unidades),
      'total_usuarios_ativos', (select count(distinct user_id) from public.membros_unidades where status = 'aprovado'),
      'total_usuarios_inativos', (select count(distinct user_id) from public.membros_unidades where status = 'inativo'),
      'total_itens', (select count(*) from public.itens_inventario where deletado_em is null),
      'total_convites_pendentes', (select count(*) from public.membros_unidades where status = 'pendente')
    ),
    'unidades', coalesce((
      select jsonb_agg(unit_row order by unit_row->>'nome')
      from (
        select jsonb_build_object(
          'id', u.id,
          'nome', u.nome,
          'criado_em', u.criado_em,
          'total_itens', count(distinct i.id) filter (where i.deletado_em is null),
          'membros', coalesce(jsonb_agg(distinct jsonb_build_object(
            'user_id', m.user_id,
            'email', au.email,
            'papel', m.papel,
            'status', m.status,
            'adicionado_em', m.adicionado_em
          )) filter (where m.user_id is not null), '[]'::jsonb)
        ) as unit_row
        from public.unidades u
        left join public.membros_unidades m on m.unidade_id = u.id
        left join auth.users au on au.id = m.user_id
        left join public.itens_inventario i on i.unidade_id = u.id
        group by u.id, u.nome, u.criado_em
      ) units
    ), '[]'::jsonb),
    'usuarios_ativos', coalesce((
      select jsonb_agg(user_row order by user_row->>'email')
      from (
        select jsonb_build_object(
          'user_id', m.user_id,
          'email', coalesce(au.email, m.user_id::text),
          'unidades', jsonb_agg(jsonb_build_object(
            'unidade_id', u.id,
            'unidade_nome', u.nome,
            'papel', m.papel,
            'status', m.status,
            'adicionado_em', m.adicionado_em
          ) order by u.nome)
        ) as user_row
        from public.membros_unidades m
        join public.unidades u on u.id = m.unidade_id
        left join auth.users au on au.id = m.user_id
        where m.status = 'aprovado'
        group by m.user_id, au.email
      ) users
    ), '[]'::jsonb),
    'usuarios_inativos', coalesce((
      select jsonb_agg(user_row order by user_row->>'email')
      from (
        select jsonb_build_object(
          'user_id', m.user_id,
          'email', coalesce(au.email, m.user_id::text),
          'unidades', jsonb_agg(jsonb_build_object(
            'unidade_id', u.id,
            'unidade_nome', u.nome,
            'papel', m.papel,
            'status', m.status,
            'adicionado_em', m.adicionado_em
          ) order by u.nome)
        ) as user_row
        from public.membros_unidades m
        join public.unidades u on u.id = m.unidade_id
        left join auth.users au on au.id = m.user_id
        where m.status = 'inativo'
        group by m.user_id, au.email
      ) users
    ), '[]'::jsonb),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'unidade_id', i.unidade_id,
        'unidade_nome', u.nome,
        'nome', i.nome,
        'categoria', i.categoria,
        'comodo', i.comodo,
        'armario', i.armario,
        'caixa', i.caixa,
        'validade', i.validade,
        'quantidade', i.quantidade,
        'criado_em', i.criado_em
      ) order by u.nome, i.nome)
      from public.itens_inventario i
      join public.unidades u on u.id = i.unidade_id
      where i.deletado_em is null
    ), '[]'::jsonb),
    'convites_pendentes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'unidade_id', m.unidade_id,
        'unidade_nome', u.nome,
        'user_id', m.user_id,
        'email', coalesce(au.email, m.user_id::text),
        'papel', m.papel,
        'status', m.status,
        'adicionado_em', m.adicionado_em
      ) order by m.adicionado_em desc)
      from public.membros_unidades m
      join public.unidades u on u.id = m.unidade_id
      left join auth.users au on au.id = m.user_id
      where m.status = 'pendente'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_saas_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Acesso negado: apenas administradores do sistema podem alterar usuarios globais.';
  end if;

  if p_active then
    update public.membros_unidades
       set status = 'aprovado'
     where user_id = p_user_id
       and status = 'inativo';
  else
    update public.membros_unidades
       set status = 'inativo'
     where user_id = p_user_id
       and status = 'aprovado';
  end if;
end;
$$;

create or replace function public.aprovar_convite_saas(p_unidade_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Acesso negado: apenas administradores do sistema podem aprovar convites globais.';
  end if;

  update public.membros_unidades
     set status = 'aprovado'
   where unidade_id = p_unidade_id
     and user_id = p_user_id
     and status = 'pendente';
end;
$$;

revoke execute on function public.get_saas_admin_snapshot() from public, anon;
revoke execute on function public.set_saas_user_active(uuid, boolean) from public, anon;
revoke execute on function public.aprovar_convite_saas(uuid, uuid) from public, anon;

grant execute on function public.get_saas_admin_snapshot() to authenticated;
grant execute on function public.set_saas_user_active(uuid, boolean) to authenticated;
grant execute on function public.aprovar_convite_saas(uuid, uuid) to authenticated;
