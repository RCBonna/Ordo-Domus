import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, PackageSearch, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatarTexto } from '@/src/lib/utils';
import type { ShoppingListItem } from '../types/domain';

interface ShoppingListProps {
  items: ShoppingListItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToItem: (nome: string) => void;
}

export function ShoppingList({ items, isLoading, onRefresh, onNavigateToItem }: ShoppingListProps) {
  const missingItems = items.filter((item) => item.prioridade === 'faltando');
  const lowStockItems = items.filter((item) => item.prioridade === 'baixo');

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
            {items.length} itens sugeridos
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

      {items.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="mb-2 text-xl font-black text-slate-800">Nada faltando agora</h3>
          <p className="font-medium text-slate-400">Itens reponíveis entram aqui quando a soma total do produto fica crítica.</p>
        </div>
      ) : (
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
      )}
    </motion.div>
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
