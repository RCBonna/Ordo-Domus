-- Função para regenerar código de convite
create or replace function regenerate_convite_code(unidade_id_param uuid)
returns text
language plpgsql
security definer
as $$
declare
  novo_codigo text;
begin
  -- Verificar se o usuário é admin da unidade
  if not exists (
    select 1 from membros_unidade 
    where unidade_id = unidade_id_param 
    and user_id = auth.uid() 
    and papel = 'admin'
  ) then
    raise exception 'Apenas administradores podem regenerar o código de convite';
  end if;
  
  -- Gerar novo código
  novo_codigo := gen_random_uuid()::text;
  
  -- Atualizar na tabela
  update unidades 
  set codigo_convite = novo_codigo 
  where id = unidade_id_param;
  
  return novo_codigo;
end;
$$;