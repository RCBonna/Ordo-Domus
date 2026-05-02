import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Unidade {
  id: string;
  nome: string;
  papel: string;
  status: string;
}

export function useAuth() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeAtiva, setUnidadeAtivaState] = useState<Unidade | null>(() => {
    const saved = localStorage.getItem('ordo_domus_unidade_ativa');
    return saved ? JSON.parse(saved) : null;
  });

  const setUnidadeAtiva = (u: Unidade | null) => {
    setUnidadeAtivaState(u);
    if (u) localStorage.setItem('ordo_domus_unidade_ativa', JSON.stringify(u));
    else localStorage.removeItem('ordo_domus_unidade_ativa');
  };
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendentesCount, setPendentesCount] = useState(0);
  const isLoggingOut = useRef(false);

  const carregarUnidades = async (userId: string): Promise<Unidade[]> => {
    try {
      const { data: membros, error: erroMembros } = await supabase
        .from('membros_unidades')
        .select('unidade_id, papel, status')
        .eq('user_id', userId)
        .eq('status', 'aprovado');

      if (erroMembros || !membros || membros.length === 0) return [];

      const unidadeIds = membros.map(m => m.unidade_id);
      const { data: unidadesData, error: erroUnidades } = await supabase
        .from('unidades')
        .select('id, nome')
        .in('id', unidadeIds);

      if (erroUnidades || !unidadesData) return [];

      return membros.map(m => {
        const unidade = unidadesData.find(u => u.id === m.unidade_id);
        if (!unidade) return null;
        return { id: unidade.id, nome: unidade.nome, papel: m.papel, status: m.status };
      }).filter(Boolean) as Unidade[];
    } catch (e) {
      console.error("[useAuth] Erro ao carregar unidades:", e);
      return [];
    }
  };

  const carregarContagemPendentes = async () => {
    if (!unidadeAtiva?.id || unidadeAtiva?.papel !== 'admin') {
      setPendentesCount(0);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('listar_pendentes', { p_unidade_id: unidadeAtiva.id });
      if (!error && data) setPendentesCount(data.length);
    } catch (err) {
      console.error("[useAuth] Erro pendentes:", err);
    }
  };

  const handleLogout = async () => {
    isLoggingOut.current = true;
    setCurrentUserEmail(null);
    setCurrentUserId(null);
    setUnidades([]);
    setUnidadeAtiva(null);
    setIsAuthLoading(false);
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      console.error("[useAuth] Erro no signOut:", e);
    }
    setTimeout(() => { isLoggingOut.current = false; }, 2000);
  };

  useEffect(() => {
    let cancelled = false;
    const processarSessao = async (userId: string, email: string | undefined) => {
      if (cancelled || isLoggingOut.current) return;
      setIsAuthLoading(true);
      const lista = await carregarUnidades(userId);
      if (cancelled || isLoggingOut.current) return;
      setCurrentUserId(userId);
      setCurrentUserEmail(email || null);
      setUnidades(lista);
      if (lista.length === 1) setUnidadeAtiva(lista[0]);
      setIsAuthLoading(false);
    };

    const inicializar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await processarSessao(session.user.id, session.user.email);
      else setIsAuthLoading(false);
    };

    inicializar();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isLoggingOut.current) return;
      if (event === 'SIGNED_IN' && session?.user) await processarSessao(session.user.id, session.user.email);
      else if (event === 'SIGNED_OUT') {
        setCurrentUserEmail(null);
        setCurrentUserId(null);
        setUnidades([]);
        setUnidadeAtiva(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    carregarContagemPendentes();
    const interval = setInterval(carregarContagemPendentes, 30000);
    return () => clearInterval(interval);
  }, [unidadeAtiva]);

  return {
    currentUserEmail,
    currentUserId,
    unidades,
    unidadeAtiva,
    setUnidadeAtiva,
    isAuthLoading,
    handleLogout,
    pendentesCount,
    setUnidades,
    carregarUnidades
  };
}
