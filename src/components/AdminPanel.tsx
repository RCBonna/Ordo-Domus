import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Loader2, UserX, Share2, Check, Copy } from 'lucide-react';

interface Props {
  unidadeId: string;
  papel: string;
}

export default function AdminPanel({ unidadeId, papel }: Props) {
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const carregarPendentes = async () => {
    if (papel !== 'admin') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    // Usa função SECURITY DEFINER para buscar pendentes (evita recursão RLS)
    const { data, error } = await supabase
      .rpc('listar_pendentes', { p_unidade_id: unidadeId });
      
    if (!error && data) {
      setPendentes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (unidadeId) carregarPendentes();
  }, [unidadeId, papel]);

  const aprovarConvidado = async (userId: string) => {
    const { error } = await supabase
      .rpc('aprovar_membro', { p_unidade_id: unidadeId, p_user_id: userId });

    if (!error) {
      setPendentes(prev => prev.filter(p => p.user_id !== userId));
    } else {
      console.error("Erro ao aprovar:", error.message);
    }
  };

  const rejeitarConvidado = async (userId: string) => {
    const { error } = await supabase
      .rpc('rejeitar_membro', { p_unidade_id: unidadeId, p_user_id: userId });

    if (!error) {
      setPendentes(prev => prev.filter(p => p.user_id !== userId));
    }
  };

  if (loading) return <Loader2 className="animate-spin w-5 h-5 text-muted-foreground m-auto" />;


  const copiarCodigo = () => {
    navigator.clipboard.writeText(unidadeId);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="mb-8 space-y-4">
      <Card className="border-none shadow-sm rounded-[24px] bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-blue-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Convidar Membros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-blue-800/80">Compartilhe o código abaixo para que outras pessoas entrem na unidade.</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-blue-900 font-mono text-sm font-semibold tracking-wide shadow-sm">
                  {unidadeId}
                </code>
                <Button size="sm" variant="outline" className={`h-8 rounded-lg ${copiado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white hover:bg-blue-50'}`} onClick={copiarCodigo}>
                  {copiado ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copiado ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: PENDENTES (Só mostra se tiver) */}
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
            {pendentes.map(convite => (
              <div key={convite.user_id} className="bg-white p-4 rounded-xl border border-orange-100 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">ID Solicitante:</span>
                  <code className="text-xs text-muted-foreground bg-gray-50 px-2 py-1 flex max-w-xs overflow-hidden text-ellipsis">{convite.user_id}</code>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="text-[10px] bg-gray-50">Solicitado em {new Date(convite.adicionado_em).toLocaleDateString()}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => rejeitarConvidado(convite.user_id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <UserX className="w-4 h-4 mr-1" /> Rejeitar
                  </Button>
                  <Button size="sm" onClick={() => aprovarConvidado(convite.user_id)} className="bg-orange-600 hover:bg-orange-700">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
