import { motion } from 'motion/react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertTriangle, Archive, Check, CheckCircle2, MapPin, PackageSearch, Plus, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarTexto } from '@/src/lib/utils';
import type { CompleteManualShoppingItemForm, ManualShoppingItem, ShoppingListItem, ZeroStockLocation } from '../types/domain';

interface ShoppingListProps {
  items: ShoppingListItem[];
  manualItems: ManualShoppingItem[];
  zeroStockLocations: ZeroStockLocation[];
  isLoading: boolean;
  isSavingManualItem: boolean;
  isCompletingManualItemId: string | null;
  onRefresh: () => void;
  onAddManualItem: (nome: string, quantidade: number, observacao: string) => Promise<void>;
  onCancelManualItem: (id: string) => void;
  onCompleteManualItem: (item: ManualShoppingItem, form: CompleteManualShoppingItemForm) => Promise<void>;
  onNavigateToItem: (nome: string) => void;
}

export function ShoppingList({
  items,
  manualItems,
  zeroStockLocations,
  isLoading,
  isSavingManualItem,
  isCompletingManualItemId,
  onRefresh,
  onAddManualItem,
  onCancelManualItem,
  onCompleteManualItem,
  onNavigateToItem,
}: ShoppingListProps) {
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualNote, setManualNote] = useState('');
  const missingItems = items.filter((item) => item.prioridade === 'faltando');
  const lowStockItems = items.filter((item) => item.prioridade === 'baixo');
  const hasAutomaticAlerts = items.length + zeroStockLocations.length > 0;

  const handleSubmitManualItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onAddManualItem(manualName, manualQuantity, manualNote);
    setManualName('');
    setManualQuantity(1);
    setManualNote('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Reposicao</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Lista de Compras</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm">
            {items.length + manualItems.length} itens na compra
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-12 rounded-2xl font-black"
          >
            <PackageSearch className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <ManualShoppingSection
          items={manualItems}
          isSaving={isSavingManualItem}
          manualName={manualName}
          manualQuantity={manualQuantity}
          manualNote={manualNote}
          setManualName={setManualName}
          setManualQuantity={setManualQuantity}
          setManualNote={setManualNote}
          onSubmit={handleSubmitManualItem}
          onCancelItem={onCancelManualItem}
          onCompleteItem={onCompleteManualItem}
          isCompletingItemId={isCompletingManualItemId}
        />

        {!hasAutomaticAlerts ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-800">Sem alertas automáticos</h3>
            <p className="font-medium text-slate-400">Itens reponíveis entram aqui quando a soma total do produto fica crítica.</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ShoppingGroup
              title="Faltando"
              description="Soma total zerada"
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="rose"
              items={missingItems}
              onNavigateToItem={onNavigateToItem}
            />
            <ShoppingGroup
              title="Estoque baixo"
              description="Soma total igual a 1"
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="amber"
              items={lowStockItems}
              onNavigateToItem={onNavigateToItem}
            />
          </div>
          <ZeroStockLocationGroup
            locations={zeroStockLocations}
            onNavigateToItem={onNavigateToItem}
          />
          </>
        )}
      </div>
    </motion.div>
  );
}

interface ManualShoppingSectionProps {
  items: ManualShoppingItem[];
  isSaving: boolean;
  manualName: string;
  manualQuantity: number;
  manualNote: string;
  setManualName: (value: string) => void;
  setManualQuantity: (value: number) => void;
  setManualNote: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelItem: (id: string) => void;
  onCompleteItem: (item: ManualShoppingItem, form: CompleteManualShoppingItemForm) => Promise<void>;
  isCompletingItemId: string | null;
}

function ManualShoppingSection({
  items,
  isSaving,
  manualName,
  manualQuantity,
  manualNote,
  setManualName,
  setManualQuantity,
  setManualNote,
  onSubmit,
  onCancelItem,
  onCompleteItem,
  isCompletingItemId,
}: ManualShoppingSectionProps) {
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<CompleteManualShoppingItemForm>({
    categoria: 'Geral',
    comodo: '',
    armario: '',
    caixa: '',
    validade: '',
    quantidade: 1,
  });

  const startPurchase = (item: ManualShoppingItem) => {
    setEditingPurchaseId(item.id);
    setPurchaseForm({
      categoria: 'Geral',
      comodo: '',
      armario: '',
      caixa: '',
      validade: '',
      quantidade: Number(item.quantidade) || 1,
    });
  };

  const submitPurchase = async (item: ManualShoppingItem) => {
    await onCompleteItem(item, purchaseForm);
    setEditingPurchaseId(null);
  };

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Itens manuais</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Adicionados diretamente na lista</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
          {items.length}
        </span>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
        <Input
          value={manualName}
          onChange={(event) => setManualName(event.target.value)}
          placeholder="Adicionar item manual..."
          className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
        />
        <Input
          type="number"
          min={1}
          value={manualQuantity}
          onChange={(event) => setManualQuantity(Math.max(1, Number(event.target.value)))}
          className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
        />
        <Input
          value={manualNote}
          onChange={(event) => setManualNote(event.target.value)}
          placeholder="Observação opcional"
          className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
        />
        <Button type="submit" disabled={isSaving} className="h-12 rounded-2xl font-black">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </form>

      {items.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-800">{formatarTexto(item.nome)}</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-400">
                    Qtd. {item.quantidade}{item.observacao ? ` - ${item.observacao}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startPurchase(item)}
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 shadow-sm transition-colors hover:bg-emerald-100"
                    title="Registrar compra no inventário"
                  >
                    <Check className="mr-1 inline h-4 w-4" />
                    Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancelItem(item.id)}
                    className="rounded-xl bg-white p-2 text-slate-400 shadow-sm transition-colors hover:text-rose-500"
                    title="Remover item manual"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editingPurchaseId === item.id && (
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-white p-4 md:grid-cols-2">
                  <Input
                    value={purchaseForm.categoria}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, categoria: event.target.value })}
                    placeholder="Categoria"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                  />
                  <Input
                    value={purchaseForm.comodo}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, comodo: event.target.value })}
                    placeholder="Cômodo"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                  />
                  <Input
                    value={purchaseForm.armario}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, armario: event.target.value })}
                    placeholder="Armário/prateleira"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                  />
                  <Input
                    value={purchaseForm.caixa}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, caixa: event.target.value })}
                    placeholder="Caixa/gaveta"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                  />
                  <Input
                    value={purchaseForm.validade}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, validade: event.target.value })}
                    placeholder="Validade opcional"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={purchaseForm.quantidade}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, quantidade: Math.max(1, Number(event.target.value)) })}
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 font-bold"
                  />
                  <div className="flex gap-2 md:col-span-2">
                    <Button
                      type="button"
                      onClick={() => submitPurchase(item)}
                      disabled={isCompletingItemId === item.id}
                      className="h-11 rounded-xl font-black"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Adicionar ao inventário
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingPurchaseId(null)}
                      className="h-11 rounded-xl font-black"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface ZeroStockLocationGroupProps {
  locations: ZeroStockLocation[];
  onNavigateToItem: (nome: string) => void;
}

function ZeroStockLocationGroup({ locations, onNavigateToItem }: ZeroStockLocationGroupProps) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Locais zerados</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Controle de posicoes sem saldo</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
          {locations.length}
        </span>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-100 p-8 text-center text-sm font-bold text-slate-300">
          Nenhum local zerado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => onNavigateToItem(location.nome)}
              className="flex w-full items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-left transition-all hover:border-sky-200 hover:bg-sky-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-800">{formatarTexto(location.nome)}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-400">
                  {formatarTexto(location.categoria || 'Sem categoria')} - {formatarTexto(location.comodo)}
                </p>
                <p className="mt-2 flex items-center gap-1 truncate text-[11px] font-bold text-slate-400">
                  <Archive className="h-3 w-3 shrink-0" />
                  {[location.armario, location.caixa].filter(Boolean).map(formatarTexto).join(' / ') || 'Local interno nao informado'}
                </p>
              </div>
              <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-600 shadow-sm">
                Qtd. 0
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

interface ShoppingGroupProps {
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'rose' | 'amber';
  items: ShoppingListItem[];
  onNavigateToItem: (nome: string) => void;
}

function ShoppingGroup({ title, description, icon, tone, items, onNavigateToItem }: ShoppingGroupProps) {
  const toneClasses = tone === 'rose'
    ? 'bg-rose-50 text-rose-600 border-rose-100'
    : 'bg-amber-50 text-amber-600 border-amber-100';

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{description}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-100 p-8 text-center text-sm font-bold text-slate-300">
          Sem itens nesta faixa.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigateToItem(item.nome)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-800">{formatarTexto(item.nome)}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-400">
                  {formatarTexto(item.categoria || 'Sem categoria')} - {formatarComodos(item.comodos)}
                </p>
                {item.totalRegistros > 1 && (
                  <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-300">
                    Soma de {item.totalRegistros} registros
                  </p>
                )}
              </div>
              <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
                Total {item.quantidade}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function formatarComodos(comodos: string[]) {
  if (comodos.length === 0) return 'Sem cômodo';
  if (comodos.length <= 2) return comodos.map(formatarTexto).join(', ');
  return `${comodos.slice(0, 2).map(formatarTexto).join(', ')} +${comodos.length - 2}`;
}
