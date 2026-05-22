import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthOverlay } from './components/AuthOverlay';
import { AuthLoadingState } from './components/AppStatusStates';
import { AdminAccessModal } from './components/AdminAccessModal';
import { WorkspaceContent } from './components/WorkspaceContent';

// Components
import { MainHeader, type AppTab } from './components/MainHeader';
import { ConfirmModal } from './components/ConfirmModal';
import { TriageModal } from './components/TriageModal';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useInventory } from './hooks/useInventory';
import { useExtraction } from './hooks/useExtraction';
import { useReceiptImport } from './hooks/useReceiptImport';
import { useTriage } from './hooks/useTriage';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { useShoppingList } from './hooks/useShoppingList';

import { supabase } from './lib/supabaseClient';

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
  } = useExtraction(unidadeAtiva?.id);

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
  } = useReceiptImport(unidadeAtiva?.id, fetchPendingItems);

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

  // Carregar inventário ao mudar de aba
  useEffect(() => {
    if (unidadeAtiva && (activeTab === 'inventário' || activeTab === 'dashboard' || activeTab === 'consumo')) {
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
    <div className="min-h-screen bg-slate-50">
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

      <AdminAccessModal
        isOpen={isAdminModalOpen}
        unidadeAtiva={unidadeAtiva}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <TriageModal 
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        unidadeId={unidadeAtiva?.id}
        onItemFinalized={addHistoryItem}
        onTriageChanged={fetchPendingItems}
      />

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
