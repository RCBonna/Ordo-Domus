import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

export interface TriageItem {
  id: string;
  nome_bruto: string;
  quantidade: number;
  valor_unitario: number | null;
  match_id: string | null;
  criado_em: string;
}

export function useTriage(unidadeId: string | undefined) {
  const [pendingItems, setPendingItems] = useState<TriageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPendingItems = useCallback(async () => {
    if (!unidadeId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('importacoes_pendentes')
        .select('*')
        .eq('unidade_id', unidadeId)
        .eq('processado', false)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setPendingItems(data || []);
    } catch (err) {
      console.error("Erro ao buscar itens para triagem:", err);
      toast.error("Não foi possível carregar os itens pendentes.");
    } finally {
      setIsLoading(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    fetchPendingItems();
  }, [fetchPendingItems]);

  const discardItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('importacoes_pendentes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setPendingItems(prev => prev.filter(item => item.id !== id));
      toast.success("Item descartado.");
    } catch (err) {
      console.error("Erro ao descartar item", err);
      toast.error("Erro ao descartar item.");
    }
  };

  return {
    pendingItems,
    isLoading,
    fetchPendingItems,
    discardItem
  };
}
