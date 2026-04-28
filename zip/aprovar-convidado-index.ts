import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  unidadeId: string
  userId: string  // Agora recebemos o user_id real (via admin autenticado)
}

serve(async (req) => {
  try {
    // 1. Verificar autenticação do admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 2. Obter o usuário logado (admin)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 })
    }

    // 3. Parse do body
    const { unidadeId, userId: convidadoId } = await req.json() as RequestBody
    if (!unidadeId || !convidadoId) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 })
    }

    // 4. Verificar se o usuário logado é admin da unidade
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from('membros_unidade')
      .select('papel')
      .eq('unidade_id', unidadeId)
      .eq('user_id', user.id)
      .single()

    if (adminError || adminCheck?.papel !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem aprovar' }), { status: 403 })
    }

    // 5. Aprovar o convidado (status pendente -> aprovado)
    const { error: updateError } = await supabaseClient
      .from('membros_unidade')
      .update({ status: 'aprovado' })
      .eq('unidade_id', unidadeId)
      .eq('user_id', convidadoId)
      .eq('status', 'pendente')  // segurança extra

    if (updateError) {
      console.error('Erro ao aprovar:', updateError)
      return new Response(JSON.stringify({ error: 'Erro ao aprovar convidado' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, message: 'Convidado aprovado com sucesso' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 })
  }
})