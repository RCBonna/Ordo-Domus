import { lazy, Suspense, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import GuestView from './GuestView';
import Onboarding from './Onboarding';
import { EntrySection, type SnapshotLocationSuggestions } from './EntrySection';
import { InventoryList } from './InventoryList';
import { PendingApprovalState, UnitSelectionPrompt } from './AppStatusStates';
import { ShoppingList } from './ShoppingList';
import { isConsumivel, formatarTexto } from '../lib/utils';
import type { AppTab } from './MainHeader';
import type { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import type { useExtraction } from '../hooks/useExtraction';
import type { useInventory } from '../hooks/useInventory';
import type { useReceiptImport } from '../hooks/useReceiptImport';
import type { useSnapshotImport } from '../hooks/useSnapshotImport';
import type { useShoppingList } from '../hooks/useShoppingList';
import type { useTriage } from '../hooks/useTriage';
import type { HistoryItem, UnitMembership } from '../types/domain';

const InventoryDashboard = lazy(() => import('./InventoryDashboard').then((module) => ({ default: module.InventoryDashboard })));
const SaasAdminDashboard = lazy(() => import('./SaasAdminDashboard').then((module) => ({ default: module.SaasAdminDashboard })));

type DashboardSlice = Pick<ReturnType<typeof useDashboardMetrics>, 'dashboardMetrics' | 'isDashboardMetricsLoading'>;
type ExtractionSlice = Pick<
  ReturnType<typeof useExtraction>,
  | 'input'
  | 'setInput'
  | 'isRecording'
  | 'recordingSeconds'
  | 'isAudioCaptureSupported'
  | 'toggleRecording'
  | 'isExtracting'
  | 'handleExtract'
  | 'currentResult'
  | 'setCurrentResult'
  | 'isPendingConfirmation'
  | 'isSaving'
  | 'confirmAndSave'
  | 'cancelConfirmation'
  | 'mergeStatus'
  | 'error'
  | 'history'
  | 'handleClearHistory'
>;
type InventorySlice = ReturnType<typeof useInventory>;
type ReceiptImportSlice = ReturnType<typeof useReceiptImport>;
type SnapshotImportSlice = ReturnType<typeof useSnapshotImport>;
type ShoppingSlice = ReturnType<typeof useShoppingList>;
type TriageSlice = Pick<ReturnType<typeof useTriage>, 'pendingItems'>;

interface WorkspaceContentProps {
  activeTab: AppTab;
  currentUserEmail: string | null;
  dashboard: DashboardSlice;
  extraction: ExtractionSlice;
  inventory: InventorySlice;
  isAuthLoading: boolean;
  isConsumoMode: boolean;
  isSistemaLiberado: boolean;
  isSystemAdmin: boolean;
  onDeleteInventoryItem: (id: string) => void;
  onOnboardingSuccess: () => Promise<void>;
  onOpenTriageModal: () => void;
  receiptImport: ReceiptImportSlice;
  snapshotImport: SnapshotImportSlice;
  setActiveTab: (tab: AppTab) => void;
  setIsConsumoMode: (value: boolean) => void;
  shopping: ShoppingSlice;
  triage: TriageSlice;
  unidadeAtiva: UnitMembership | null;
  unidades: UnitMembership[];
}

export function WorkspaceContent({
  activeTab,
  currentUserEmail,
  dashboard,
  extraction,
  inventory,
  isAuthLoading,
  isConsumoMode,
  isSistemaLiberado,
  isSystemAdmin,
  onDeleteInventoryItem,
  onOnboardingSuccess,
  onOpenTriageModal,
  receiptImport,
  snapshotImport,
  setActiveTab,
  setIsConsumoMode,
  shopping,
  triage,
  unidadeAtiva,
  unidades,
}: WorkspaceContentProps) {
  const snapshotLocationSuggestions = useMemo(
    () => buildSnapshotLocationSuggestions(
      inventory.fullInventory,
      snapshotImport.snapshotContext.comodo,
      snapshotImport.snapshotContext.armario,
    ),
    [inventory.fullInventory, snapshotImport.snapshotContext.comodo, snapshotImport.snapshotContext.armario],
  );

  if (!currentUserEmail || isAuthLoading) return null;

  if (!unidadeAtiva) {
    return (
      <div className="transition-all duration-500 opacity-100 scale-100">
        {unidades.length > 0 ? <UnitSelectionPrompt /> : <Onboarding onSuccess={onOnboardingSuccess} />}
      </div>
    );
  }

  if (unidadeAtiva.status === 'pendente') {
    return (
      <div className="transition-all duration-500 opacity-100 scale-100">
        <PendingApprovalState unidadeNome={unidadeAtiva.nome} />
      </div>
    );
  }

  if (unidadeAtiva.papel === 'convidado') {
    return (
      <div className="transition-all duration-500 opacity-100 scale-100">
        <GuestView unidadeId={unidadeAtiva.id} />
      </div>
    );
  }

  return (
    <div className="transition-all duration-500 opacity-100 scale-100">
      <AnimatePresence mode="wait">
        {activeTab === 'entrada' && (
          <EntrySection
            key="tab-entrada"
            input={extraction.input}
            setInput={extraction.setInput}
            isRecording={extraction.isRecording}
            recordingSeconds={extraction.recordingSeconds}
            isAudioCaptureSupported={extraction.isAudioCaptureSupported}
            toggleRecording={extraction.toggleRecording}
            isExtracting={extraction.isExtracting}
            isSistemaLiberado={isSistemaLiberado}
            error={extraction.error}
            handleExtract={extraction.handleExtract}
            currentResult={extraction.currentResult}
            setCurrentResult={extraction.setCurrentResult}
            isPendingConfirmation={extraction.isPendingConfirmation}
            isSaving={extraction.isSaving}
            confirmAndSave={extraction.confirmAndSave}
            cancelConfirmation={extraction.cancelConfirmation}
            mergeStatus={extraction.mergeStatus}
            history={extraction.history}
            handleClearHistory={extraction.handleClearHistory}
            isImporting={receiptImport.isImporting}
            fileInputRef={receiptImport.fileInputRef}
            handleImportReceipt={receiptImport.handleImportReceipt}
            triggerImport={receiptImport.triggerImport}
            isSnapshotImporting={snapshotImport.isSnapshotImporting}
            snapshotFileInputRef={snapshotImport.snapshotFileInputRef}
            handleImportSnapshot={snapshotImport.handleImportSnapshot}
            triggerSnapshotImport={snapshotImport.triggerSnapshotImport}
            snapshotContext={snapshotImport.snapshotContext}
            setSnapshotContext={snapshotImport.setSnapshotContext}
            snapshotLocationSuggestions={snapshotLocationSuggestions}
            pendingTriageCount={triage.pendingItems.length}
            openTriageModal={onOpenTriageModal}
          />
        )}

        {activeTab === 'inventário' && (
          <InventoryList
            key="tab-inventario"
            inventory={inventory.fullInventory}
            isInventoryLoading={inventory.isInventoryLoading}
            isConsumoMode={isConsumoMode}
            searchTerm={inventory.searchTerm}
            setSearchTerm={inventory.setSearchTerm}
            categoryFilter={inventory.categoryFilter}
            setCategoryFilter={inventory.setCategoryFilter}
            roomFilter={inventory.roomFilter}
            setRoomFilter={inventory.setRoomFilter}
            expiryFilter={inventory.expiryFilter}
            setExpiryFilter={inventory.setExpiryFilter}
            inventoryPage={inventory.inventoryPage}
            setInventoryPage={inventory.setInventoryPage}
            inventoryPageSize={inventory.inventoryPageSize}
            setInventoryPageSize={inventory.setInventoryPageSize}
            inventoryTotal={inventory.inventoryTotal}
            clearInventoryFilters={inventory.clearInventoryFilters}
            onConsume={inventory.handleConsumeItem}
            onDelete={onDeleteInventoryItem}
            onUpdate={inventory.handleUpdateItem}
            editingItemId={inventory.editingItemId}
            editingItemData={inventory.editingItemData}
            savingItemId={inventory.savingItemId}
            setEditingItemData={inventory.setEditingItemData}
            onEdit={inventory.handleStartEdit}
            onCancelEdit={inventory.handleCancelEdit}
          />
        )}

        {activeTab === 'compras' && (
          <ShoppingList
            key="tab-compras"
            items={shopping.shoppingItems}
            manualItems={shopping.manualShoppingItems}
            zeroStockLocations={shopping.zeroStockLocations}
            isLoading={shopping.isShoppingListLoading}
            isSavingManualItem={shopping.isSavingManualItem}
            isCompletingManualItemId={shopping.isCompletingManualItemId}
            onRefresh={shopping.carregarListaDeCompras}
            onAddManualItem={shopping.adicionarItemManual}
            onCancelManualItem={shopping.cancelarItemManual}
            onCompleteManualItem={shopping.concluirCompraManual}
            onPrepareManualItem={shopping.prepararCompraManual}
            onNavigateToItem={(nome) => {
              inventory.setSearchTerm(nome);
              setActiveTab('inventário');
              setIsConsumoMode(false);
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <Suspense key="tab-dashboard" fallback={<LazySectionFallback label="Carregando dashboard..." />}>
            <InventoryDashboard
              fullInventory={inventory.fullInventory}
              history={extraction.history as HistoryItem[]}
              dashboardMetrics={dashboard.dashboardMetrics}
              isDashboardMetricsLoading={dashboard.isDashboardMetricsLoading}
              isConsumivel={isConsumivel}
              formatarTexto={formatarTexto}
              onNavigateToItem={(nome) => {
                inventory.setSearchTerm(nome);
                setActiveTab('inventário');
              }}
            />
          </Suspense>
        )}

        {activeTab === 'saas-admin' && isSystemAdmin && (
          <Suspense key="tab-saas-admin" fallback={<LazySectionFallback label="Carregando painel SaaS..." />}>
            <SaasAdminDashboard />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildSnapshotLocationSuggestions(
  items: InventorySlice['fullInventory'],
  selectedRoom?: string,
  selectedCabinet?: string,
): SnapshotLocationSuggestions {
  const normalizedRoom = normalizeSuggestionKey(selectedRoom);
  const normalizedCabinet = normalizeSuggestionKey(selectedCabinet);

  const rooms = uniqueSorted(items.map((item) => item.comodo));
  const cabinets = uniqueSorted(items
    .filter((item) => !normalizedRoom || normalizeSuggestionKey(item.comodo) === normalizedRoom)
    .map((item) => item.armario));
  const boxes = uniqueSorted(items
    .filter((item) => !normalizedRoom || normalizeSuggestionKey(item.comodo) === normalizedRoom)
    .filter((item) => !normalizedCabinet || normalizeSuggestionKey(item.armario) === normalizedCabinet)
    .map((item) => item.caixa));

  return { rooms, cabinets, boxes };
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const byKey = new Map<string, string>();

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = normalizeSuggestionKey(trimmed);
    if (!byKey.has(key)) byKey.set(key, trimmed);
  }

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function normalizeSuggestionKey(value?: string | null) {
  return value?.trim().toLocaleLowerCase('pt-BR') || '';
}

function LazySectionFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-100 bg-white text-sm font-black text-slate-400 shadow-sm dark:border-border dark:bg-card dark:text-muted-foreground dark:shadow-none">
      {label}
    </div>
  );
}
