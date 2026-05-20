-- Políticas de Segurança RLS (Row Level Security) atualizadas para a Issue #1
-- Habilitam a atualização e exclusão (soft-delete ou física) de itens_inventario 
-- para membros aprovados nas respectivas unidades.

drop policy if exists "Membros aprovados atualizam" on itens_inventario;
create policy "Membros aprovados atualizam"
  on itens_inventario for update
  using (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );

drop policy if exists "Membros aprovados deletam" on itens_inventario;
create policy "Membros aprovados deletam"
  on itens_inventario for delete
  using (
    unidade_id in (select unidade_id from membros_unidades where user_id = auth.uid() and status = 'aprovado')
  );
