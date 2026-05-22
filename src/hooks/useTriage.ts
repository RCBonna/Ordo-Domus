import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';
import { toast } from 'sonner';
import { finalizeReceiptImportItem } from '../repositories/inventoryRepository';
import type { HistoryItem, ReceiptTriageDraft } from '../types/domain';
import { formatarData, formatarTexto, getErrorMessage, normalizarBusca, normalizarCategoria } from '../lib/utils';

const TRIAGE_LOAD_TIMEOUT_MS = 20000;

async function withTriageTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('Tempo limite ao carregar triagem.')), TRIAGE_LOAD_TIMEOUT_MS);
    }),
  ]);
}

export interface DictionaryMatch {
  nome_oficial_inventario: string;
  categoria: string | null;
  comodo: string | null;
}

export type TriageMatchLevel = 'strong' | 'possible' | 'weak';

export interface InventoryTriageMatch {
  nome: string;
  categoria: string | null;
  comodo: string;
  armario: string | null;
  caixa: string | null;
  validade: string | null;
}

export interface TriageItem {
  id: string;
  nome_bruto: string;
  quantidade: number;
  valor_unitario: number | null;
  categoria_sugerida?: string | null;
  match_id: string | null;
  criado_em: string;
  // Smart Match fields (preenchido pelo dicionário)
  dictMatch?: DictionaryMatch | null;
  inventoryMatch?: InventoryTriageMatch | null;
  matchLevel: TriageMatchLevel;
  matchReason: string;
}

export function buildTriageDraft(item: TriageItem): ReceiptTriageDraft {
  const inventoryMatch = item.matchLevel !== 'weak' ? item.inventoryMatch : null;

  return {
    nome: item.dictMatch?.nome_oficial_inventario || inventoryMatch?.nome || item.nome_bruto,
    categoria: normalizarCategoria(item.dictMatch?.categoria || inventoryMatch?.categoria || item.categoria_sugerida || inferCategoryFromName(item.nome_bruto)),
    comodo: item.dictMatch?.comodo || inventoryMatch?.comodo || '',
    armario: inventoryMatch?.armario || '',
    caixa: inventoryMatch?.caixa || '',
    validade: inventoryMatch?.validade || '',
    quantidade: Math.max(1, Number(item.quantidade) || 1),
  };
}

export function useTriage(unidadeId: string | undefined) {
  const [pendingItems, setPendingItems] = useState<TriageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadRequestId = useRef(0);

  const fetchPendingItems = useCallback(async () => {
    if (!unidadeId) return;
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;

    setIsLoading(true);
    try {
      const pendingQuery = supabase
          .from('importacoes_pendentes')
          .select('*')
          .eq('unidade_id', unidadeId)
          .eq('processado', false)
          .gt('expires_at', new Date().toISOString())
          .order('criado_em', { ascending: false });

      const dictionaryQuery = supabase
          .from('dicionario_produtos')
          .select('nome_bruto_cupom, nome_oficial_inventario, categoria, comodo')
          .eq('unidade_id', unidadeId);

      const inventoryQuery = supabase
          .from('itens_inventario')
          .select('nome,categoria,comodo,armario,caixa,validade')
          .eq('unidade_id', unidadeId)
          .is('deletado_em', null)
          .limit(1000);

      const [
        { data: pendentes, error: errPendentes },
        dictionaryResult,
        inventoryResult,
      ] = await withTriageTimeout(Promise.all([
        pendingQuery,
        dictionaryQuery,
        inventoryQuery,
      ]));

      if (requestId !== loadRequestId.current) return;

      if (errPendentes) throw errPendentes;
      if (!pendentes || pendentes.length === 0) {
        setPendingItems([]);
        return;
      }

      const dictMap = new Map<string, DictionaryMatch>();
      if (dictionaryResult.error) {
        logger.warn(`Dicionario da triagem indisponivel: ${dictionaryResult.error.message}`);
      } else if (dictionaryResult.data) {
        for (const d of dictionaryResult.data) {
          const key = normalizarBusca(d.nome_bruto_cupom);
          dictMap.set(key, {
            nome_oficial_inventario: d.nome_oficial_inventario,
            categoria: d.categoria,
            comodo: d.comodo
          });
        }
      }

      if (inventoryResult.error) {
        logger.warn(`Inventario para smart match indisponivel: ${inventoryResult.error.message}`);
      }

      const inventoryMatches = !inventoryResult.error && inventoryResult.data
        ? (inventoryResult.data as InventoryTriageMatch[])
        : [];

      // 3. Enriquecer cada item pendente com o match do dicionário
      const enriched: TriageItem[] = pendentes.map(item => {
        const key = normalizarBusca(item.nome_bruto);
        const match = dictMap.get(key) || null;
        const inventoryMatchResult = selectInventoryMatch(item.nome_bruto, match, inventoryMatches);
        const matchLevel = getMatchLevel(match, inventoryMatchResult.score);

        return {
          ...item,
          dictMatch: match,
          inventoryMatch: inventoryMatchResult.item,
          matchLevel,
          matchReason: getMatchReason(match, inventoryMatchResult.score),
        };
      });

      logger.debug('Smart match da triagem concluido.');
      setPendingItems(enriched);
    } catch (error) {
      if (requestId !== loadRequestId.current) return;
      logger.warn(`Falha ao buscar itens para triagem: ${getErrorMessage(error)}`);
      toast.error("Não foi possível carregar os itens pendentes.");
    } finally {
      if (requestId === loadRequestId.current) setIsLoading(false);
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
    } catch {
      logger.warn('Falha ao descartar item de triagem.');
      toast.error("Erro ao descartar item.");
    }
  };

  const discardAllItems = async () => {
    const ids = pendingItems.map((item) => item.id);
    if (ids.length === 0) return;

    try {
      const { error } = await supabase
        .from('importacoes_pendentes')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setPendingItems([]);
      toast.success('Triagem descartada.');
    } catch {
      logger.warn('Falha ao descartar triagem completa.');
      toast.error('Erro ao descartar a triagem.');
    }
  };

  const finalizeItem = async (item: TriageItem, draft: ReceiptTriageDraft): Promise<HistoryItem> => {
    const normalizedDraft = normalizeTriageDraft(draft);

    const result = await finalizeReceiptImportItem({
      importacaoId: item.id,
      nome: normalizedDraft.nome,
      categoria: normalizedDraft.categoria,
      comodo: normalizedDraft.comodo,
      armario: normalizedDraft.armario,
      caixa: normalizedDraft.caixa,
      validade: normalizedDraft.validade,
      quantidade: normalizedDraft.quantidade,
    });

    setPendingItems(prev => prev.filter(pendingItem => pendingItem.id !== item.id));

    return {
      item: result?.nome || normalizedDraft.nome,
      categoria: result?.categoria || normalizedDraft.categoria,
      comodo: result?.comodo || normalizedDraft.comodo,
      armario: result?.armario || normalizedDraft.armario,
      caixa: result?.caixa || normalizedDraft.caixa,
      validade: result?.validade || normalizedDraft.validade,
      quantidade: Math.max(1, Number(result?.quantidade) || normalizedDraft.quantidade),
      tipo: 'entrada',
      data: new Date().toISOString(),
      transcricao: item.nome_bruto,
    };
  };

  return {
    pendingItems,
    isLoading,
    fetchPendingItems,
    discardItem,
    discardAllItems,
    finalizeItem,
  };
}

function normalizeTriageDraft(draft: ReceiptTriageDraft): ReceiptTriageDraft {
  return {
    nome: formatarTexto(draft.nome),
    categoria: normalizarCategoria(draft.categoria),
    comodo: formatarTexto(draft.comodo),
    armario: formatarTexto(draft.armario),
    caixa: formatarTexto(draft.caixa),
    validade: formatarData(draft.validade) || '',
    quantidade: Math.max(1, Number(draft.quantidade) || 1),
  };
}

function selectInventoryMatch(
  rawName: string,
  dictMatch: DictionaryMatch | null,
  inventory: InventoryTriageMatch[],
) {
  const candidates = [
    rawName,
    dictMatch?.nome_oficial_inventario || '',
  ].filter(Boolean);

  let best: { item: InventoryTriageMatch | null; score: number } = { item: null, score: 0 };

  for (const item of inventory) {
    const itemName = normalizarBusca(item.nome);
    for (const candidate of candidates) {
      const score = calculateNameScore(normalizarBusca(candidate), itemName);
      if (score > best.score) {
        best = { item, score };
      }
    }
  }

  return best;
}

function getMatchLevel(dictMatch: DictionaryMatch | null, inventoryScore: number): TriageMatchLevel {
  if (dictMatch || inventoryScore >= 0.92) return 'strong';
  if (inventoryScore >= 0.72) return 'possible';
  return 'weak';
}

function getMatchReason(dictMatch: DictionaryMatch | null, inventoryScore: number) {
  if (dictMatch) return 'Dicionário da unidade';
  if (inventoryScore >= 0.92) return 'Inventário existente';
  if (inventoryScore >= 0.72) return 'Possível item existente';
  return 'Sem correspondência confiável';
}

function calculateNameScore(candidate: string, inventoryName: string) {
  if (!candidate || !inventoryName) return 0;
  if (candidate === inventoryName) return 1;
  if (isMeaningfulPrefixOrContainment(candidate, inventoryName)) return 0.86;
  return diceCoefficient(candidate, inventoryName);
}

function isMeaningfulPrefixOrContainment(a: string, b: string) {
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 5) return false;

  const shorterTokens = shorter.split(' ').filter(token => token.length >= 4);
  if (shorterTokens.length === 0) return false;

  return longer.startsWith(shorter) || longer.includes(` ${shorter} `) || longer.endsWith(` ${shorter}`);
}

function diceCoefficient(a: string, b: string) {
  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  if (aBigrams.length === 0 || bBigrams.length === 0) return 0;

  const bCounts = new Map<string, number>();
  for (const bigram of bBigrams) {
    bCounts.set(bigram, (bCounts.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (const bigram of aBigrams) {
    const count = bCounts.get(bigram) || 0;
    if (count > 0) {
      intersection += 1;
      bCounts.set(bigram, count - 1);
    }
  }

  return (2 * intersection) / (aBigrams.length + bBigrams.length);
}

function getBigrams(value: string) {
  const compact = value.replace(/\s+/g, '');
  if (compact.length < 2) return compact ? [compact] : [];

  const bigrams: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.push(compact.slice(index, index + 2));
  }
  return bigrams;
}

function inferCategoryFromName(rawName: string) {
  const normalized = normalizarBusca(rawName);
  const tokens = new Set(normalized.split(' ').filter(Boolean));

  if (hasAnyToken(tokens, ['cerveja', 'suco', 'cha', 'refrigerante', 'agua', 'vinho', 'leite', 'gatorade', 'bebida', 'bebidas'])) {
    return 'Bebidas';
  }

  if (hasAnyToken(tokens, ['acucar', 'arroz', 'feijao', 'macarrao', 'farinha', 'oleo', 'azeite', 'sal', 'molho', 'biscoito', 'bolacha', 'cafe', 'alimento', 'alimentos'])) {
    return 'Alimentos';
  }

  if (hasAnyToken(tokens, ['detergente', 'sabao', 'amaciante', 'desinfetante', 'alcool', 'limpador', 'esponja', 'limpeza'])) {
    return 'Limpeza';
  }

  if (hasAnyToken(tokens, ['sabonete', 'shampoo', 'condicionador', 'creme', 'desodorante', 'pasta', 'escova', 'higiene'])) {
    return 'Higiene';
  }

  if (hasAnyToken(tokens, ['suculenta', 'planta', 'plantas', 'terra', 'adubo', 'vaso'])) {
    return 'Plantas';
  }

  if (hasAnyToken(tokens, ['ferramenta', 'ferramentas', 'parafuso', 'prego', 'broca', 'furadeira'])) {
    return 'Ferramentas';
  }

  return '';
}

function hasAnyToken(tokens: Set<string>, expected: string[]) {
  return expected.some((token) => tokens.has(token));
}
