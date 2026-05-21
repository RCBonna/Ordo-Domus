import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { Loader2, MapPin, ArrowRight, Clock, X, Package } from 'lucide-react';

// Components
import Auth from './components/Auth';
import GuestView from './components/GuestView';
import AdminPanel from './components/AdminPanel';
import Onboarding from './components/Onboarding';
import { InventoryDashboard } from './components/InventoryDashboard';
import { InventoryList } from './components/InventoryList';
import { ShoppingList } from './components/ShoppingList';
import { EntrySection } from './components/EntrySection';
import { MainHeader } from './components/MainHeader';
import { ConfirmModal } from './components/ConfirmModal';
import { TriageModal } from './components/TriageModal';
import { SaasAdminDashboard } from './components/SaasAdminDashboard';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useInventory } from './hooks/useInventory';
import { useExtraction } from './hooks/useExtraction';
import { useReceiptImport } from './hooks/useReceiptImport';
import { useTriage, type TriageItem } from './hooks/useTriage';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { useShoppingList } from './hooks/useShoppingList';

// Utils
import { isConsumivel, formatarTexto } from './lib/utils';
import { supabase } from './lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [activeTab, setActiveTab] = useState<'entrada' | 'inventário' | 'compras' | 'consumo' | 'dashboard' | 'saas-admin'>('entrada');
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
    isRecording, toggleRecording,
    isExtracting, handleExtract,
    currentResult, setCurrentResult,
    isPendingConfirmation, setIsPendingConfirmation, isSaving, confirmAndSave, cancelConfirmation,
    mergeStatus, error,
    history, handleClearHistory,
    addHistoryItem
  } = useExtraction(unidadeAtiva?.id);

  // Triage logic
  const {
    pendingItems,
    discardItem,
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
    concluirCompraManual
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

  const handleReviewTriageItem = (item: TriageItem) => {
    setIsTriageModalOpen(false);
    setActiveTab('entrada');

    // Se houver Smart Match, preencher com dados do dicionário
    const match = item.dictMatch;
    setCurrentResult({
      item: match?.nome_oficial_inventario || item.nome_bruto,
      categoria: match?.categoria || '',
      comodo: match?.comodo || '',
      armario: '',
      caixa: '',
      validade: '',
      quantidade: Number(item.quantidade),
      transcricao: item.nome_bruto,
      triage_id: item.id
    });
    setIsPendingConfirmation(true);
  };

  const isSistemaLiberado = !!(!isAuthLoading && unidadeAtiva);

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
        {/* LOGIN / AUTH */}
        {/* LOGIN MODAL */}
        {!currentUserEmail && !isAuthLoading && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative z-10 w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 sm:p-10">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-primary rounded-[20px] flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                    <Package className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Bem-vindo ao Ordo</h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Sua casa em ordem, sem esforço</p>
                </div>
                <Auth />
              </div>
            </motion.div>
          </div>
        )}

        {/* LOADING GERAL */}
        {isAuthLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando Ordo Domus...</p>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        {currentUserEmail && !isAuthLoading && (
          <div className="transition-all duration-500 opacity-100 scale-100">
          {!unidadeAtiva ? (
            unidades.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="w-12 h-12 text-slate-300" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Selecione uma Unidade</h2>
                <p className="text-slate-500 max-w-sm">Use o seletor no topo da tela para escolher qual inventário deseja gerenciar agora.</p>
              </div>
            ) : (
              <Onboarding onSuccess={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  const lista = await carregarUnidades(session.user.id);
                  setUnidades(lista);
                  if (lista.length === 1) setUnidadeAtiva(lista[0]);
                }
              }} />
            )
          ) : (
            <>
              {unidadeAtiva.status === 'pendente' ? (
                <div className="max-w-lg mx-auto bg-white p-12 rounded-[32px] shadow-sm border border-slate-100 text-center">
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Aguardando Aprovação</h2>
                  <p className="text-slate-500">O administrador da unidade <strong>{unidadeAtiva.nome}</strong> precisa aprovar seu acesso.</p>
                </div>
              ) : unidadeAtiva.papel === 'convidado' ? (
                <GuestView unidadeId={unidadeAtiva.id} />
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === 'entrada' && (
                    <EntrySection 
                      key="tab-entrada"
                      input={input}
                      setInput={setInput}
                      isRecording={isRecording}
                      toggleRecording={toggleRecording}
                      isExtracting={isExtracting}
                      isSistemaLiberado={isSistemaLiberado}
                      error={error}
                      handleExtract={handleExtract}
                      currentResult={currentResult}
                      setCurrentResult={setCurrentResult}
                      isPendingConfirmation={isPendingConfirmation}
                      isSaving={isSaving}
                      confirmAndSave={confirmAndSave}
                      cancelConfirmation={cancelConfirmation}
                      mergeStatus={mergeStatus}
                      history={history}
                      handleClearHistory={handleClearHistory}
                      isImporting={isImporting}
                      fileInputRef={fileInputRef}
                      handleImportReceipt={handleImportReceipt}
                      triggerImport={triggerImport}
                      pendingTriageCount={pendingItems.length}
                      openTriageModal={() => setIsTriageModalOpen(true)}
                    />
                  )}

                  {activeTab === 'inventário' && (
                    <InventoryList 
                      key="tab-inventario"
                      inventory={fullInventory}
                      isInventoryLoading={isInventoryLoading}
                      isConsumoMode={isConsumoMode}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      categoryFilter={categoryFilter}
                      setCategoryFilter={setCategoryFilter}
                      roomFilter={roomFilter}
                      setRoomFilter={setRoomFilter}
                      expiryFilter={expiryFilter}
                      setExpiryFilter={setExpiryFilter}
                      inventoryPage={inventoryPage}
                      setInventoryPage={setInventoryPage}
                      inventoryPageSize={inventoryPageSize}
                      setInventoryPageSize={setInventoryPageSize}
                      inventoryTotal={inventoryTotal}
                      clearInventoryFilters={clearInventoryFilters}
                      onConsume={handleConsumeItem}
                      onDelete={handleDeleteItem}
                      onUpdate={handleUpdateItem}
                      editingItemId={editingItemId}
                      editingItemData={editingItemData}
                      setEditingItemData={setEditingItemData}
                      onEdit={handleStartEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  )}

                  {activeTab === 'compras' && (
                    <ShoppingList
                      key="tab-compras"
                      items={shoppingItems}
                      manualItems={manualShoppingItems}
                      zeroStockLocations={zeroStockLocations}
                      isLoading={isShoppingListLoading}
                      isSavingManualItem={isSavingManualItem}
                      isCompletingManualItemId={isCompletingManualItemId}
                      onRefresh={carregarListaDeCompras}
                      onAddManualItem={adicionarItemManual}
                      onCancelManualItem={cancelarItemManual}
                      onCompleteManualItem={concluirCompraManual}
                      onNavigateToItem={(nome) => {
                        setSearchTerm(nome);
                        setActiveTab('inventário');
                        setIsConsumoMode(false);
                      }}
                    />
                  )}

                  {activeTab === 'dashboard' && (
                    <InventoryDashboard 
                      key="tab-dashboard"
                      fullInventory={fullInventory}
                      history={history}
                      dashboardMetrics={dashboardMetrics}
                      isDashboardMetricsLoading={isDashboardMetricsLoading}
                      isConsumivel={isConsumivel}
                      formatarTexto={formatarTexto}
                      onNavigateToItem={(nome) => {
                        setSearchTerm(nome);
                        setActiveTab('inventário');
                      }}
                    />
                  )}

                  {activeTab === 'saas-admin' && isSystemAdmin && (
                    <SaasAdminDashboard key="tab-saas-admin" />
                  )}
                </AnimatePresence>
              )}
            </>
          )}
        </div>
        )}
      </main>

      {/* MODAL ADMIN */}
      <AnimatePresence>
        {isAdminModalOpen && unidadeAtiva && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-8 right-8 z-20">
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => setIsAdminModalOpen(false)}
                  className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <ScrollArea className="max-h-[85vh]">
                <div className="p-10">
                  <AdminPanel unidadeId={unidadeAtiva.id} papel={unidadeAtiva.papel} unidadeNome={unidadeAtiva.nome} />
                </div>
              </ScrollArea>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TriageModal 
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        unidadeId={unidadeAtiva?.id}
        onReviewItem={handleReviewTriageItem}
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
