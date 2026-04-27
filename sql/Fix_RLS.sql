-- ==========================================
-- CORREÇÃO DAS REGRAS DE SEGURANÇA (RLS)
-- ==========================================

-- Para que os usuários possam CRIAR suas próprias Unidades no Onboarding:
create policy "Criar novas unidades"
  on unidades for insert
  with check (auth.uid() is not null);

-- Para que os usuários possam INGRESSAR ou SEREM ADICIONADOS como admin na tabela membros:
create policy "Inserir membros na unidade"
  on membros_unidade for insert
  with check (auth.uid() = user_id);

-- Para permitir que um administrador remova membros ou atualize status:
-- (Isso garante que o botão Aprovar e Rejeitar funcionem)
create policy "Administrador atualiza membros"
  on membros_unidade for update
  using (
    auth.uid() in (
      select user_id from membros_unidade 
      where unidade_id = membros_unidade.unidade_id and papel = 'admin'
    )
  );

create policy "Administrador deleta membros"
  on membros_unidade for delete
  using (
    auth.uid() in (
      select user_id from membros_unidade 
      where unidade_id = membros_unidade.unidade_id and papel = 'admin'
    )
  );
