import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getErrorMessage } from '../lib/utils';
import { logger } from '../lib/logger';

interface OnboardingProps {
  onSuccess: () => void;
}

export default function Onboarding({ onSuccess }: OnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  // States para Criar
  const [nomeUnidade, setNomeUnidade] = useState('');
  
  // States para Entrar
  const [codigoUnidade, setCodigoUnidade] = useState('');

  const handleCriarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeUnidade.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não logado");

      const newUnitId = crypto.randomUUID();

      // 1. Criar a Unidade (sem .select() para evitar erro de RLS ao tentar ler a linha antes de ser membro)
      const { error: errUnidade } = await supabase
        .from('unidades')
        .insert({ id: newUnitId, nome: nomeUnidade.trim() });

      if (errUnidade) throw errUnidade;

      // 2. Adicionar o membro como admin
      const { error: errMembro } = await supabase
        .from('membros_unidades')
        .insert({
          unidade_id: newUnitId,
          user_id: userData.user.id,
          papel: 'admin',
          status: 'aprovado'
        });

      if (errMembro) throw errMembro;

      setMessage({ type: 'success', text: 'Unidade criada com sucesso!' });
      setTimeout(() => onSuccess(), 1500);
    } catch (err: unknown) {
      logger.warn('Falha ao criar unidade.');
      setMessage({ type: 'error', text: getErrorMessage(err, 'Erro inesperado.') });
    } finally {
      setLoading(false);
    }
  };

  const handleEntrarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpo = codigoUnidade.trim();
    if (!codigoLimpo) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não logado");

      // Adicionar o membro como convidado pendente
      const { error: errMembro } = await supabase
        .from('membros_unidades')
        .insert({
          unidade_id: codigoLimpo,
          user_id: userData.user.id,
          papel: 'convidado',
          status: 'pendente'
        });

      if (errMembro) {
        if (errMembro.code === '23503') { // Foreign key violation
          throw new Error("Código da unidade não encontrado.");
        }
        if (errMembro.code === '23505') { // Unique constraint
           throw new Error("Você já enviou uma solicitação para esta unidade.");
        }
        throw errMembro;
      }

      setMessage({ type: 'success', text: 'Solicitação enviada! O administrador da unidade precisa aprovar seu acesso.' });
      setTimeout(() => onSuccess(), 2000);
    } catch (err: unknown) {
      logger.warn('Falha ao solicitar acesso a unidade.');
      setMessage({ type: 'error', text: getErrorMessage(err, 'Erro inesperado.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2 dark:text-foreground">Bem-vindo(a) ao Ordo Domus!</h2>
        <p className="text-muted-foreground text-lg">Para começar, você precisa criar uma Unidade nova ou entrar em uma existente.</p>
      </div>

      {message && (
        <div className={`p-4 mb-8 rounded-xl flex items-start gap-3 text-sm font-medium max-w-2xl mx-auto ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200' : 'bg-green-50 text-green-800 border border-green-100 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200'}`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* CARD 1: Criar Unidade */}
        <Card className="border-none shadow-md rounded-[24px] dark:border dark:border-border dark:bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Criar minha Unidade
            </CardTitle>
            <CardDescription>
              Seja o administrador do seu próprio inventário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCriarUnidade} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nomeUnidade">Nome da Unidade</Label>
                <Input 
                  id="nomeUnidade"
                  placeholder="Ex: Casa de Praia, Depósito, Meu Apê..." 
                  value={nomeUnidade}
                  onChange={(e) => setNomeUnidade(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Criar Nova Unidade
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* CARD 2: Entrar via Código */}
        <Card className="border-none shadow-md rounded-[24px] dark:border dark:border-border dark:bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-primary" />
              Entrar via Código
            </CardTitle>
            <CardDescription>
              Se alguém te convidou, cole o código da unidade abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEntrarUnidade} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigoUnidade">Código de Convite</Label>
                <Input 
                  id="codigoUnidade"
                  placeholder="Cole o código aqui..." 
                  value={codigoUnidade}
                  onChange={(e) => setCodigoUnidade(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" variant="secondary" disabled={loading} className="w-full rounded-xl">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Solicitar Acesso
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
