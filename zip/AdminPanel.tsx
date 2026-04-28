import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Loader2, UserX, Share2, Check, Copy, AlertCircle } from 'lucide-react';

interface Props {
  unidadeId: string;
  papel: string;
}

interface MembroPendente {
  user_id: string;
  user_hash?: string; // Hash anônimo do user_id
  papel: string;
  status: string;
  adicionado_em: string;
}

export default function AdminPanel({ unidadeId, papel }: Props) {
  const [pendentes, setPendentes] = useState<MembroPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [codigoConvite, setCodigoConvite] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  // Carregar código de convite da unidade
  const carregarCodigoConvite = async () => {
    if (papel !== 'admin') return;
    
    const { data, error } = await supabase
      .from('unidades')
      .select('codigo_convite')
      .eq('id', unidadeId)
      .single();
      
    if (!error && data) {
      setCodigoConvite(data.codigo_convite);
    } else {
      setErroConvite("Não foi possível carregar o código de convite.");
    }
  };

  const carregarPendentes = async () => {
    if (papel !== 'admin') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Usar a view anônima para não expor user_id diretamente
    const { data, error } = await supabase
      .from('membros_unidade_view')
      .select('*')
      .eq('unidade_id', unidadeId)
      .eq('status', 'pendente');
      
    if (!error && data) {
      // Mapear para o formato esperado (user_hash é o identificador anônimo)
      const membrosFormatados = data.map(item => ({
        user_id: item.user_hash, // Usar hash em vez do ID real
        user_hash: item.user_hash,
        papel: item.papel,
        status: item.status,
        adicionado_em: item.adicionado_em
      }));
      setPendentes(membrosFormatados);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (unidadeId) {
      carregarCodigoConvite();
      carregarPendentes();
    }
  }, [unidadeId, papel]);

  const aprovarConvidado = async (userHash: string) => {
    // Como temos apenas o hash, precisamos buscar o user_id real
    // Nota: Esta é uma limitação da view anônima.
    // Alternativa: Armazenar em estado o user_id real apenas para operações.
    // Por segurança, esta operação deve ser feita via Edge Function.
    
    // SOLUÇÃO TEMPORÁRIA: Buscar o user_id real (apenas admin pode fazer isso)
    const { data: membroReal, error: buscaError } = await supabase
      .from('membros_unidade')
      .select('user_id')
      .eq('unidade_id', unidadeId)
      .eq('status', 'pendente');

    if (buscaError || !membroReal) {
      alert("Erro ao identificar o convidado.");
      return;
    }

    // Encontrar o membro correspondente (isso é frágil - ideal seria Edge Function)
    // Por isso, recomendo usar Edge Function para aprovação.
    alert("Funcionalidade de aprovação requer implementação via Edge Function por segurança.");
    return;

    /* Implementação correta (Edge Function):
    const { error } = await supabase.functions.invoke('aprovar-convidado', {
      body: { unidadeId, userHash }
    });
    */
  };

  const rejeitarConvidado = async (userHash: string) => {
    alert("Funcionalidade de rejeição requer implementação via Edge Function por segurança.");
  };

  const gerarNovoCodigoConvite = async () => {
    if (!confirm("Gerar um novo código de convite invalidará o código atual. Todos os convites pendentes com o código antigo não funcionarão mais. Continuar?")) {
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .rpc('regenerate_convite_code', { unidade_id_param: unidadeId });

    if (!error && data) {
      setCodigoConvite(data);
      setCopiado(false);
      alert("Novo código de convite gerado com sucesso!");
    } else {
      alert("Erro ao gerar novo código: " + error?.message);
    }
    setLoading(false);
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoConvite);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (papel !== 'admin') {
    return null;
  }

  if (loading && !codigoConvite) {
    return <Loader2 className="animate-spin w-5 h-5 text-muted-foreground m-auto" />;
  }

  return (
    <div className="mb-8 space-y-4">
      {/* SEÇÃO 1: COMPARTILHAR CÓDIGO DE CONVITE */}
      <Card className="border-none shadow-sm rounded-[24px] bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-blue-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Convidar Membros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-sm text-blue-800/80">
                Compartilhe o código abaixo para que outras pessoas possam solicitar acesso à sua unidade.
              </p>
              {erroConvite ? (
                <div className="flex items-center gap-2 mt-3 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{erroConvite}</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
                  <code className="px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-blue-900 font-mono text-sm font-semibold tracking-wide shadow-sm break-all">
                    {codigoConvite}
                  </code>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`h-9 rounded-lg ${copiado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white hover:bg-blue-50'}`} 
                      onClick={copiarCodigo}
                    >
                      {copiado ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                      {copiado ? "Copiado!" : "Copiar"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-9 rounded-lg bg-white hover:bg-yellow-50 text-yellow-700 border-yellow-200"
                      onClick={gerarNovoCodigoConvite}
                      disabled={loading}
                    >
                      <Loader2 className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                      Gerar Novo Código
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-blue-700/60 mt-2">
                ⚠️ Atenção: Gerar um novo código invalida o anterior.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: SOLICITAÇÕES PENDENTES */}
      {pendentes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 shadow-sm rounded-[24px]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-800">
              <Users className="w-5 h-5" />
              Aprovações Pendentes
            </CardTitle>
            <CardDescription className="text-orange-700/70">
              {pendentes.length} visitante(s) solicitando permissão para acessar esta unidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendentes.map((convite, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-sm text-gray-700">Solicitante:</span>
                  <code className="text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded font-mono break-all">
                    {convite.user_hash?.substring(0, 16)}... (ID anônimo)
                  </code>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="text-[10px] bg-gray-50">
                      Solicitado em {new Date(convite.adicionado_em).toLocaleDateString()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">
                      Pendente
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => rejeitarConvidado(convite.user_hash)} 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserX className="w-4 h-4 mr-1" /> Rejeitar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => aprovarConvidado(convite.user_hash)} 
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 3: AVISO SOBRE EDGE FUNCTIONS */}
      {pendentes.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/30 shadow-sm rounded-[24px]">
          <CardContent className="pt-4">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Nota de segurança:</strong> A aprovação/rejeição de convidados requer uma Edge Function no Supabase 
                para proteger os dados dos usuários. As funções estão desativadas nesta versão do front-end. 
                Consulte a documentação para implementar as Edge Functions necessárias.
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}