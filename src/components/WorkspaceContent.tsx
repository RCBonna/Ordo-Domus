import { AnimatePresence } from 'motion/react';
import GuestView from './GuestView';
import Onboarding from './Onboarding';
import { EntrySection } from './EntrySection';
import { InventoryDashboard } from './InventoryDashboard';
import { InventoryList } from './InventoryList';
import { PendingApprovalState, UnitSelectionPrompt } from './AppStatusStates';
import { SaasAdminDashboard } from './SaasAdminDashboard';
import { ShoppingList } from './ShoppingList';
import { isConsumivel, formatarTexto } from '../lib/utils';
import type { AppTab } from './MainHeader';
import type { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import type { useExtraction } from '../hooks/useExtraction';
import type { useInventory } from '../hooks/useInventory';
import type { useReceiptImport } from '../hooks/useReceiptImport';
import type { useShoppingList } from '../hooks/useShoppingList';
import type { useTriage } from '../hooks/useTriage';
import type { HistoryItem, UnitMembership } from '../types/domain';

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
  setActiveTab,
  setIsConsumoMode,
  shopping,
  triage,
  unidadeAtiva,
  unidades,
}: WorkspaceContentProps) {
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
          <InventoryDashboard
            key="tab-dashboard"
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
        )}

        {activeTab === 'saas-admin' && isSystemAdmin && (
          <SaasAdminDashboard key="tab-saas-admin" />
        )}
      </AnimatePresence>
    </div>
  );
}
