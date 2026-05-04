import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

export interface DictionaryMatch {
  nome_oficial_inventario: string;
  categoria: string | null;
  comodo: string | null;
}

export interface TriageItem {
  id: string;
  nome_bruto: string;
  quantidade: number;
  valor_unitario: number | null;
  match_id: string | null;
  criado_em: string;
  // Smart Match fields (preenchido pelo dicionário)
  dictMatch?: DictionaryMatch | null;
}

export function useTriage(unidadeId: string | undefined) {
  const [pendingItems, setPendingItems] = useState<TriageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPendingItems = useCallback(async () => {
    if (!unidadeId) return;
    setIsLoading(true);
    try {
      // 1. Buscar itens pendentes
      const { data: pendentes, error: errPendentes } = await supabase
        .from('importacoes_pendentes')
        .select('*')
        .eq('unidade_id', unidadeId)
        .eq('processado', false)
        .order('criado_em', { ascending: false });

      if (errPendentes) throw errPendentes;
      if (!pendentes || pendentes.length === 0) {
        setPendingItems([]);
        return;
      }

      // 2. Buscar dicionário da unidade para Smart Match
      const { data: dicionario, error: errDict } = await supabase
        .from('dicionario_produtos')
        .select('nome_bruto_cupom, nome_oficial_inventario, categoria, comodo')
        .eq('unidade_id', unidadeId);

      // Montar um Map para lookup rápido (case-insensitive, trimmed)
      const dictMap = new Map<string, DictionaryMatch>();
      if (!errDict && dicionario) {
        for (const d of dicionario) {
          const key = d.nome_bruto_cupom.trim().toLowerCase();
          dictMap.set(key, {
            nome_oficial_inventario: d.nome_oficial_inventario,
            categoria: d.categoria,
            comodo: d.comodo
          });
        }
      }

      // 3. Enriquecer cada item pendente com o match do dicionário
      const enriched: TriageItem[] = pendentes.map(item => {
        const key = item.nome_bruto.trim().toLowerCase();
        const match = dictMap.get(key) || null;
        return { ...item, dictMatch: match };
      });

      console.log(`[SmartMatch] ${enriched.filter(i => i.dictMatch).length}/${enriched.length} itens com match no dicionário`);
      setPendingItems(enriched);
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
