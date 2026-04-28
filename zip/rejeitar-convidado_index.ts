import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  unidadeId: string
  userId: string
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 })
    }

    const { unidadeId, userId: convidadoId } = await req.json() as RequestBody
    if (!unidadeId || !convidadoId) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 })
    }

    // Verificar admin
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from('membros_unidade')
      .select('papel')
      .eq('unidade_id', unidadeId)
      .eq('user_id', user.id)
      .single()

    if (adminError || adminCheck?.papel !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem rejeitar' }), { status: 403 })
    }

    // Remover o convidado (delete)
    const { error: deleteError } = await supabaseClient
      .from('membros_unidade')
      .delete()
      .eq('unidade_id', unidadeId)
      .eq('user_id', convidadoId)
      .eq('status', 'pendente')

    if (deleteError) {
      console.error('Erro ao rejeitar:', deleteError)
      return new Response(JSON.stringify({ error: 'Erro ao rejeitar convidado' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, message: 'Convidado rejeitado' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 })
  }
})