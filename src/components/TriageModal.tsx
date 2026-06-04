import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Trash2, Loader2, Package, Sparkles, Save, AlertTriangle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildTriageDraft, useTriage } from '../hooks/useTriage';
import type { TriageMatchLevel } from '../hooks/useTriage';
import type { HistoryItem, ReceiptTriageDraft } from '../types/domain';

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidadeId: string | undefined;
  onItemFinalized: (item: HistoryItem) => void;
  onTriageChanged: () => void;
}

export function TriageModal({ isOpen, onClose, unidadeId, onItemFinalized, onTriageChanged }: TriageModalProps) {
  const { pendingItems, isLoading, discardItem, discardAllItems, fetchPendingItems, finalizeItem } = useTriage(unidadeId);
  const [drafts, setDrafts] = useState<Record<string, ReceiptTriageDraft>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isDiscardingAll, setIsDiscardingAll] = useState(false);
  const [isDiscardAllConfirmOpen, setIsDiscardAllConfirmOpen] = useState(false);
  const [matchFilter, setMatchFilter] = useState<'all' | TriageMatchLevel>('all');

  useEffect(() => {
    if (isOpen) {
      fetchPendingItems();
    }
  }, [isOpen, fetchPendingItems]);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, ReceiptTriageDraft> = {};
      for (const item of pendingItems) {
        next[item.id] = current[item.id] || buildTriageDraft(item);
      }
      return next;
    });
  }, [pendingItems]);

  const matchedCount = pendingItems.filter((item) => item.dictMatch).length;
  const matchCounts = {
    strong: pendingItems.filter((item) => item.matchLevel === 'strong').length,
    possible: pendingItems.filter((item) => item.matchLevel === 'possible').length,
    weak: pendingItems.filter((item) => item.matchLevel === 'weak').length,
  };
  const filteredItems = matchFilter === 'all'
    ? pendingItems
    : pendingItems.filter((item) => item.matchLevel === matchFilter);
  const isMutating = isBulkSaving || Boolean(savingItemId) || isDiscardingAll;

  const readySmartItems = useMemo(() => pendingItems.filter((item) => {
    const draft = drafts[item.id];
    return Boolean(item.matchLevel === 'strong' && draft && isDraftReady(draft));
  }), [drafts, pendingItems]);

  const updateDraft = (id: string, patch: Partial<ReceiptTriageDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  };

  const handleDiscard = async (id: string) => {
    await discardItem(id);
    onTriageChanged();
  };

  const handleDiscardAll = async () => {
    setIsDiscardingAll(true);
    try {
      await discardAllItems();
      setIsDiscardAllConfirmOpen(false);
      onTriageChanged();
    } finally {
      setIsDiscardingAll(false);
    }
  };

  const handleSaveItem = async (itemId: string) => {
    const item = pendingItems.find((pendingItem) => pendingItem.id === itemId);
    const draft = drafts[itemId];
    if (!item || !draft) return;

    if (!isDraftReady(draft)) {
      toast.error('Preencha nome, categoria e cômodo antes de salvar.');
      return;
    }

    setSavingItemId(itemId);
    try {
      const historyItem = await finalizeItem(item, draft);
      onItemFinalized(historyItem);
      onTriageChanged();
      toast.success('Item efetivado no inventário.');
    } catch {
      toast.error('Não foi possível efetivar o item.');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleBulkAcceptSmartMatches = async () => {
    if (readySmartItems.length === 0) {
      toast.error('Nenhum Smart Match pronto para aceitar em massa.');
      return;
    }

    setIsBulkSaving(true);
    let savedCount = 0;
    try {
      for (const item of readySmartItems) {
        const draft = drafts[item.id];
        if (!draft) continue;

        const historyItem = await finalizeItem(item, draft);
        onItemFinalized(historyItem);
        savedCount += 1;
      }

      onTriageChanged();
      toast.success(`${savedCount} ${savedCount === 1 ? 'item efetivado' : 'itens efetivados'} no inventário.`);
    } catch {
      toast.error('A aceitação em massa foi interrompida. Revise os itens restantes.');
      onTriageChanged();
      await fetchPendingItems();
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-transparent bg-white shadow-xl dark:border-border dark:bg-card"
      >
        <div className="border-b border-gray-100 bg-gray-50/50 p-6 dark:border-border dark:bg-muted/30">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-foreground">
                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                Triagem de Importações
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
                Corrija os dados e efetive os itens sem sair da triagem.
                {matchedCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {matchedCount} {matchedCount === 1 ? 'item reconhecido por dicionário' : 'itens reconhecidos por dicionário'}
                  </span>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="shrink-0 rounded-xl font-black text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pendingItems.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDiscardAllConfirmOpen(true)}
                disabled={isMutating}
                className="rounded-xl border-rose-200 font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Descartar triagem
              </Button>
            )}
            {readySmartItems.length > 0 && (
              <Button
                type="button"
                onClick={handleBulkAcceptSmartMatches}
                disabled={isMutating}
                className="rounded-xl bg-emerald-600 font-black hover:bg-emerald-700"
              >
                {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Aceitar Smart Matches ({readySmartItems.length})
              </Button>
            )}
          </div>

          {pendingItems.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <FilterButton
                label="Todos"
                count={pendingItems.length}
                isActive={matchFilter === 'all'}
                onClick={() => setMatchFilter('all')}
              />
              {matchCounts.strong > 0 && (
                <FilterButton
                  label="Fortes"
                  count={matchCounts.strong}
                  isActive={matchFilter === 'strong'}
                  onClick={() => setMatchFilter('strong')}
                  tone="strong"
                />
              )}
              {matchCounts.possible > 0 && (
                <FilterButton
                  label="Possíveis"
                  count={matchCounts.possible}
                  isActive={matchFilter === 'possible'}
                  onClick={() => setMatchFilter('possible')}
                  tone="possible"
                />
              )}
              {matchCounts.weak > 0 && (
                <FilterButton
                  label="Fracos"
                  count={matchCounts.weak}
                  isActive={matchFilter === 'weak'}
                  onClick={() => setMatchFilter('weak')}
                  tone="weak"
                />
              )}
            </div>
          )}
        </div>

        {isDiscardAllConfirmOpen && (
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-4 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-rose-900 dark:text-rose-100">Descartar todos os itens pendentes?</p>
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                    Isso remove {pendingItems.length} {pendingItems.length === 1 ? 'item desta triagem' : 'itens desta triagem'} e não altera o inventário.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDiscardAllConfirmOpen(false)}
                  disabled={isDiscardingAll}
                  className="rounded-xl bg-white font-black dark:bg-card dark:text-foreground dark:hover:bg-accent"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleDiscardAll}
                  disabled={isDiscardingAll}
                  className="rounded-xl bg-rose-600 font-black hover:bg-rose-700"
                >
                  {isDiscardingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Descartar tudo
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1 bg-gray-50/30 dark:bg-background/40">
          <div className="p-6">
          {isLoading && pendingItems.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando triagem...
            </div>
          )}
          {isLoading && pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-muted-foreground">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-indigo-500 dark:text-indigo-300" />
              <p>Carregando itens pendentes...</p>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-muted-foreground">Nenhum item pendente para triagem.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-muted-foreground">Nenhum item neste filtro.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const draft = drafts[item.id] || buildTriageDraft(item);
                const isReady = isDraftReady(draft);
                const isSaving = savingItemId === item.id;
                const tone = getMatchTone(item.matchLevel);
                const origin = getOriginMeta(item.origem);
                const confidence = typeof item.confianca === 'number' ? item.confianca : null;
                const isLowConfidenceSnapshot = item.origem === 'snapshot' && confidence !== null && confidence < 0.6;
                const observation = item.source_metadata?.observacao;
                const barcode = item.source_metadata?.codigo_barras;
                const brand = item.source_metadata?.marca;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md dark:shadow-none ${isLowConfidenceSnapshot ? 'border-amber-300 bg-amber-50/70 ring-1 ring-amber-100 dark:border-amber-900/70 dark:bg-amber-950/25 dark:ring-amber-900/30' : tone.card}`}
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-foreground">{item.nome_bruto}</h3>
                          <Badge className={`px-1.5 py-0 text-[10px] font-bold ${origin.badge}`}>
                            {origin.icon}
                            {origin.label}
                          </Badge>
                          <Badge className={`px-1.5 py-0 text-[10px] font-bold ${tone.badge}`}>
                            <Sparkles className="mr-0.5 h-3 w-3" />
                            {tone.label}
                          </Badge>
                          {confidence !== null && (
                            <Badge className={`px-1.5 py-0 text-[10px] font-bold ${confidence < 0.6 ? 'border border-amber-200 bg-white text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300' : 'border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300'}`}>
                              {Math.round(confidence * 100)}% confiança
                            </Badge>
                          )}
                          <span className={`text-xs font-bold ${tone.reason}`}>{item.matchReason}</span>
                          {item.valor_unitario && (
                            <span className="text-xs font-bold text-gray-400 dark:text-muted-foreground">R$ {item.valor_unitario}</span>
                          )}
                        </div>
                        {(observation || brand || barcode || item.validade_sugerida) && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-muted-foreground">
                            {brand && <span>Marca: {brand}</span>}
                            {barcode && <span>Codigo: {barcode}</span>}
                            {item.validade_sugerida && <span>Validade sugerida: {item.validade_sugerida}</span>}
                            {observation && <span className="text-amber-700 dark:text-amber-300">Obs.: {observation}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
                          onClick={() => handleDiscard(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Descartar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isMutating || !isReady}
                          className={`gap-2 ${tone.button}`}
                          onClick={() => handleSaveItem(item.id)}
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : item.dictMatch ? <Sparkles className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                          Salvar
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.7fr]">
                      <Input
                        disabled={isMutating}
                        value={draft.nome}
                        onChange={(event) => updateDraft(item.id, { nome: event.target.value })}
                        placeholder="Nome oficial"
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground"
                      />
                      <Input
                        disabled={isMutating}
                        value={draft.categoria}
                        onChange={(event) => updateDraft(item.id, { categoria: event.target.value })}
                        placeholder="Categoria"
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground"
                      />
                      <Input
                        disabled={isMutating}
                        value={draft.comodo}
                        onChange={(event) => updateDraft(item.id, { comodo: event.target.value })}
                        placeholder="Cômodo"
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground"
                      />
                      <Input
                        type="number"
                        min={1}
                        disabled={isMutating}
                        value={draft.quantidade}
                        onChange={(event) => updateDraft(item.id, { quantidade: Math.max(1, Number(event.target.value) || 1) })}
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground"
                      />
                      <Input
                        disabled={isMutating}
                        value={draft.armario}
                        onChange={(event) => updateDraft(item.id, { armario: event.target.value })}
                        placeholder="Armário/prateleira"
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground"
                      />
                      <Input
                        disabled={isMutating}
                        value={draft.caixa}
                        onChange={(event) => updateDraft(item.id, { caixa: event.target.value })}
                        placeholder="Caixa/gaveta"
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground"
                      />
                      <Input
                        disabled={isMutating}
                        value={draft.validade}
                        onChange={(event) => updateDraft(item.id, { validade: event.target.value })}
                        placeholder="Validade"
                        className="h-11 rounded-xl bg-slate-50 font-bold dark:bg-background dark:text-foreground md:col-span-2"
                      />
                    </div>

                    {!isReady && (
                      <p className="mt-3 text-xs font-bold text-amber-600 dark:text-amber-300">
                        Nome, categoria e cômodo são obrigatórios para efetivar este item.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </ScrollArea>
      </motion.div>
    </div>
  );
}

function isDraftReady(draft: ReceiptTriageDraft) {
  return draft.nome.trim().length > 0
    && draft.categoria.trim().length > 0
    && draft.comodo.trim().length > 0
    && Number(draft.quantidade) > 0;
}

function getMatchTone(level: TriageMatchLevel) {
  if (level === 'strong') {
    return {
      label: 'Match forte',
      card: 'border-emerald-200 bg-emerald-50/45 ring-1 ring-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:ring-emerald-900/30',
      badge: 'border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      reason: 'text-emerald-700 dark:text-emerald-300',
    };
  }

  if (level === 'possible') {
    return {
      label: 'Possível match',
      card: 'border-amber-200 bg-amber-50/55 ring-1 ring-amber-100 dark:border-amber-900/70 dark:bg-amber-950/25 dark:ring-amber-900/30',
      badge: 'border border-amber-200 bg-white text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300',
      button: 'bg-amber-500 hover:bg-amber-600',
      reason: 'text-amber-700 dark:text-amber-300',
    };
  }

  return {
    label: 'Match fraco',
    card: 'border-slate-200 bg-white dark:border-border dark:bg-card',
    badge: 'border border-slate-200 bg-slate-50 text-slate-500 dark:border-border dark:bg-muted dark:text-muted-foreground',
    button: 'bg-slate-700 hover:bg-slate-800',
    reason: 'text-slate-400 dark:text-muted-foreground',
  };
}

function getOriginMeta(origin?: string) {
  if (origin === 'snapshot') {
    return {
      label: 'Foto',
      badge: 'border border-indigo-200 bg-white text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/35 dark:text-indigo-300',
      icon: <Camera className="mr-0.5 h-3 w-3" />,
    };
  }

  if (origin === 'barcode') {
    return {
      label: 'Codigo',
      badge: 'border border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted dark:text-muted-foreground',
      icon: <Package className="mr-0.5 h-3 w-3" />,
    };
  }

  if (origin === 'video') {
    return {
      label: 'Video',
      badge: 'border border-purple-200 bg-white text-purple-700 dark:border-purple-900/70 dark:bg-purple-950/35 dark:text-purple-300',
      icon: <Camera className="mr-0.5 h-3 w-3" />,
    };
  }

  return {
    label: 'Cupom',
    badge: 'border border-slate-200 bg-white text-slate-500 dark:border-border dark:bg-muted dark:text-muted-foreground',
    icon: <Package className="mr-0.5 h-3 w-3" />,
  };
}

interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  tone?: TriageMatchLevel;
}

function FilterButton({ label, count, isActive, onClick, tone }: FilterButtonProps) {
  const toneClass = tone === 'strong'
    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/70 dark:text-emerald-300 dark:hover:bg-emerald-950/35'
    : tone === 'possible'
      ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/70 dark:text-amber-300 dark:hover:bg-amber-950/35'
      : tone === 'weak'
        ? 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted'
        : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/70 dark:text-indigo-300 dark:hover:bg-indigo-950/35';

  const activeClass = tone === 'strong'
    ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
    : tone === 'possible'
      ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
      : tone === 'weak'
        ? 'bg-slate-700 border-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500'
        : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${isActive ? activeClass : toneClass}`}
    >
      {label}
      <span className={`ml-2 rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  );
}
