-- Issue #19: basic unit settings managed by unit admins.

create or replace function public.atualizar_configuracao_unidade(
  p_unidade_id uuid,
  p_nome text
)
returns table (
  id uuid,
  nome text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  v_nome := nullif(trim(p_nome), '');

  if v_nome is null then
    raise exception 'Nome da unidade e obrigatorio.';
  end if;

  if length(v_nome) > 120 then
    raise exception 'Nome da unidade deve ter no maximo 120 caracteres.';
  end if;

  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.papel = 'admin'
      and m.status = 'aprovado'
  ) then
    raise exception 'Acesso negado: apenas admins aprovados podem alterar a unidade.';
  end if;

  update public.unidades u
     set nome = v_nome
   where u.id = p_unidade_id
   returning u.id, u.nome
   into id, nome;

  if id is null then
    raise exception 'Unidade nao encontrada.';
  end if;

  return next;
end;
$$;

revoke execute on function public.atualizar_configuracao_unidade(uuid, text) from public, anon;
grant execute on function public.atualizar_configuracao_unidade(uuid, text) to authenticated;
