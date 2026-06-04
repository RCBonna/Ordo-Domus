import { lazy, Suspense, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthOverlay } from './components/AuthOverlay';
import { AuthLoadingState } from './components/AppStatusStates';
import { WorkspaceContent } from './components/WorkspaceContent';
import { AiConsentModal } from './components/AiConsentModal';

// Components
import { MainHeader, type AppTab } from './components/MainHeader';
import { ConfirmModal } from './components/ConfirmModal';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useInventory } from './hooks/useInventory';
import { useExtraction } from './hooks/useExtraction';
import { useReceiptImport } from './hooks/useReceiptImport';
import { useSnapshotImport } from './hooks/useSnapshotImport';
import { useTriage } from './hooks/useTriage';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { useShoppingList } from './hooks/useShoppingList';
import { useAiConsent } from './hooks/useAiConsent';
import { useThemePreference } from './hooks/useThemePreference';

import { supabase } from './lib/supabaseClient';

const AdminAccessModal = lazy(() => import('./components/AdminAccessModal').then((module) => ({ default: module.AdminAccessModal })));
const TriageModal = lazy(() => import('./components/TriageModal').then((module) => ({ default: module.TriageModal })));

export default function OrdoDomus() {
  // Auth state
  const {
    currentUserEmail,
    unidades,
    unidadeAtiva,
    setUnidadeAtiva,
    isAuthLoading,
    handleLogout,
    pendentesCount,
    setUnidades,
    carregarUnidades,
    isSystemAdmin
  } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppTab>('entrada');
  const [isConsumoMode, setIsConsumoMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const isDashboardTabActive = activeTab === 'dashboard';
  const isShoppingTabActive = activeTab === 'compras';
  const {
    aiConsentRequest,
    acceptAiConsent,
    declineAiConsent,
    ensureAiConsent,
  } = useAiConsent(currentUserEmail);
  const themePreference = useThemePreference(currentUserEmail);
  
  // Confirmation State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Extraction logic
  const {
    input, setInput,
    isRecording, recordingSeconds, isAudioCaptureSupported, toggleRecording,
    isExtracting, handleExtract,
    currentResult, setCurrentResult,
    isPendingConfirmation, isSaving, confirmAndSave, cancelConfirmation,
    mergeStatus, error,
    history, handleClearHistory,
    addHistoryItem
  } = useExtraction(unidadeAtiva?.id, ensureAiConsent);

  // Triage logic
  const {
    pendingItems,
    fetchPendingItems
  } = useTriage(unidadeAtiva?.id);

  // Receipt Import logic
  const {
    isImporting,
    fileInputRef,
    handleImportReceipt,
    triggerImport
  } = useReceiptImport(unidadeAtiva?.id, fetchPendingItems, ensureAiConsent);

  const snapshotImport = useSnapshotImport(unidadeAtiva?.id, fetchPendingItems, ensureAiConsent);

  // Inventory logic

  const {
    fullInventory,
    isInventoryLoading,
    searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter,
    roomFilter, setRoomFilter,
    expiryFilter, setExpiryFilter,
    inventoryPage, setInventoryPage,
    inventoryPageSize, setInventoryPageSize,
    inventoryTotal,
    clearInventoryFilters,
    editingItemId,
    editingItemData,
    savingItemId,
    setEditingItemData,
    carregarInventarioCompleto,
    handleStartEdit,
    handleCancelEdit,
    handleUpdateItem,
    handleDeleteItem: rawHandleDelete,
    handleConsumeItem
  } = useInventory(unidadeAtiva?.id, addHistoryItem);

  const {
    dashboardMetrics,
    isDashboardMetricsLoading
  } = useDashboardMetrics(unidadeAtiva?.id, isDashboardTabActive);

  const {
    shoppingItems,
    manualShoppingItems,
    zeroStockLocations,
    isShoppingListLoading,
    isSavingManualItem,
    isCompletingManualItemId,
    carregarListaDeCompras,
    adicionarItemManual,
    cancelarItemManual,
    concluirCompraManual,
    prepararCompraManual
  } = useShoppingList(unidadeAtiva?.id, isShoppingTabActive, addHistoryItem);

  const handleDeleteItem = (id: string) => {
    const item = fullInventory.find(i => i.id === id);
    if (!item) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Item?',
      message: `Tem certeza que deseja excluir "${item.nome}"? Esta ação será registrada no histórico de auditoria.`,
      onConfirm: () => rawHandleDelete(id)
    });
  };

  const isSistemaLiberado = !!(!isAuthLoading && unidadeAtiva);

  const handleOnboardingSuccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const lista = await carregarUnidades(session.user.id);
    setUnidades(lista);
    if (lista.length === 1) setUnidadeAtiva(lista[0]);
  };

  const handleUnitUpdated = (unit: { id: string; nome: string }) => {
    setUnidades(prev => prev.map(item => (
      item.id === unit.id ? { ...item, nome: unit.nome } : item
    )));

    if (unidadeAtiva?.id === unit.id) {
      setUnidadeAtiva({ ...unidadeAtiva, nome: unit.nome });
    }
  };

  // Carregar inventário ao mudar de aba e alimentar sugestoes de local da entrada
  useEffect(() => {
    if (unidadeAtiva && (activeTab === 'entrada' || activeTab === 'inventário' || activeTab === 'dashboard' || activeTab === 'consumo')) {
      carregarInventarioCompleto();
    }
  }, [
    activeTab,
    unidadeAtiva,
    searchTerm,
    categoryFilter,
    roomFilter,
    expiryFilter,
    inventoryPage,
    inventoryPageSize
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-foreground transition-colors dark:bg-background">
      <MainHeader 
        unidades={unidades}
        unidadeAtiva={unidadeAtiva}
        setUnidadeAtiva={setUnidadeAtiva}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendentesCount={pendentesCount}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onSignOut={handleLogout}
        currentUserEmail={currentUserEmail}
        isConsumoMode={isConsumoMode}
        setIsConsumoMode={setIsConsumoMode}
        isSistemaLiberado={isSistemaLiberado}
        isSystemAdmin={isSystemAdmin}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {!currentUserEmail && !isAuthLoading && <AuthOverlay />}
        {isAuthLoading && <AuthLoadingState />}

        <WorkspaceContent
          activeTab={activeTab}
          currentUserEmail={currentUserEmail}
          dashboard={{ dashboardMetrics, isDashboardMetricsLoading }}
          extraction={{
            input,
            setInput,
            isRecording,
            recordingSeconds,
            isAudioCaptureSupported,
            toggleRecording,
            isExtracting,
            handleExtract,
            currentResult,
            setCurrentResult,
            isPendingConfirmation,
            isSaving,
            confirmAndSave,
            cancelConfirmation,
            mergeStatus,
            error,
            history,
            handleClearHistory,
          }}
          inventory={{
            fullInventory,
            isInventoryLoading,
            searchTerm,
            setSearchTerm,
            categoryFilter,
            setCategoryFilter,
            roomFilter,
            setRoomFilter,
            expiryFilter,
            setExpiryFilter,
            inventoryPage,
            setInventoryPage,
            inventoryPageSize,
            setInventoryPageSize,
            inventoryTotal,
            clearInventoryFilters,
            editingItemId,
            editingItemData,
            savingItemId,
            setEditingItemData,
            carregarInventarioCompleto,
            handleStartEdit,
            handleCancelEdit,
            handleUpdateItem,
            handleDeleteItem: rawHandleDelete,
            handleConsumeItem,
          }}
          isAuthLoading={isAuthLoading}
          isConsumoMode={isConsumoMode}
          isSistemaLiberado={isSistemaLiberado}
          isSystemAdmin={isSystemAdmin}
          onDeleteInventoryItem={handleDeleteItem}
          onOnboardingSuccess={handleOnboardingSuccess}
          onOpenTriageModal={() => setIsTriageModalOpen(true)}
          receiptImport={{
            isImporting,
            fileInputRef,
            handleImportReceipt,
            triggerImport,
          }}
          snapshotImport={snapshotImport}
          setActiveTab={setActiveTab}
          setIsConsumoMode={setIsConsumoMode}
          shopping={{
            shoppingItems,
            manualShoppingItems,
            zeroStockLocations,
            isShoppingListLoading,
            isSavingManualItem,
            isCompletingManualItemId,
            carregarListaDeCompras,
            adicionarItemManual,
            cancelarItemManual,
            concluirCompraManual,
            prepararCompraManual,
          }}
          triage={{
            pendingItems,
          }}
          unidadeAtiva={unidadeAtiva}
          unidades={unidades}
        />
      </main>

      {isAdminModalOpen && (
        <Suspense fallback={null}>
          <AdminAccessModal
            isOpen={isAdminModalOpen}
            unidadeAtiva={unidadeAtiva}
            onClose={() => setIsAdminModalOpen(false)}
            onUnitUpdated={handleUnitUpdated}
            themePreference={themePreference.preference}
            resolvedTheme={themePreference.resolvedTheme}
            onThemePreferenceChange={themePreference.setPreference}
          />
        </Suspense>
      )}

      {isTriageModalOpen && (
        <Suspense fallback={null}>
          <TriageModal
            isOpen={isTriageModalOpen}
            onClose={() => setIsTriageModalOpen(false)}
            unidadeId={unidadeAtiva?.id}
            onItemFinalized={addHistoryItem}
            onTriageChanged={fetchPendingItems}
          />
        </Suspense>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <AiConsentModal
        request={aiConsentRequest}
        onAccept={acceptAiConsent}
        onDecline={declineAiConsent}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
