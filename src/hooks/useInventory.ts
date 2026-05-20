import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { fetchInventoryPage } from '../repositories/inventoryRepository';
import {
  consumeInventoryItemWithAudit,
  deleteInventoryItemWithAudit,
  undoConsumeInventoryItemWithAudit,
  updateInventoryItemWithAudit,
} from '../services/inventoryService';
import type { EditableInventoryItem, HistoryItem, InventoryExpiryFilter, InventoryItem } from '../types/domain';

export function useInventory(unidadeId: string | undefined, onActionRecorded?: (item: HistoryItem) => void) {
  const [fullInventory, setFullInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilterState] = useState('');
  const [roomFilter, setRoomFilterState] = useState('');
  const [expiryFilter, setExpiryFilterState] = useState<InventoryExpiryFilter>('todos');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(24);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<EditableInventoryItem | null>(null);

  const resetToFirstPage = () => setInventoryPage(1);

  const updateSearchTerm = (term: string) => {
    setSearchTerm(term);
    resetToFirstPage();
  };

  const setCategoryFilter = (value: string) => {
    setCategoryFilterState(value);
    resetToFirstPage();
  };

  const setRoomFilter = (value: string) => {
    setRoomFilterState(value);
    resetToFirstPage();
  };

  const setExpiryFilter = (value: InventoryExpiryFilter) => {
    setExpiryFilterState(value);
    resetToFirstPage();
  };

  const updateInventoryPageSize = (value: number) => {
    setInventoryPageSize(value);
    resetToFirstPage();
  };

  const clearInventoryFilters = () => {
    setSearchTerm('');
    setCategoryFilterState('');
    setRoomFilterState('');
    setExpiryFilterState('todos');
    resetToFirstPage();
  };

  const carregarInventarioCompleto = async (silent = false) => {
    if (!unidadeId) return;
    if (!silent) setIsInventoryLoading(true);
    try {
      const { items, total } = await fetchInventoryPage({
        unidadeId,
        searchTerm,
        categoryFilter,
        roomFilter,
        expiryFilter,
        page: inventoryPage,
        pageSize: inventoryPageSize,
      });

      setFullInventory(items);
      setInventoryTotal(total);
    } catch {
      logger.warn('Falha ao carregar inventario.');
    } finally {
      if (!silent) setIsInventoryLoading(false);
    }
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditingItemData({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItemData(null);
  };

  const handleUpdateItem = async () => {
    if (!editingItemId || !editingItemData || !unidadeId) return;
    
    // Buscar dados atuais para comparar se houve mudança de quantidade
    const originalItem = fullInventory.find(i => i.id === editingItemId);

    try {
      const historyItem = await updateInventoryItemWithAudit({
        unidadeId,
        itemId: editingItemId,
        editingItemData,
        originalItem,
      });

      if (onActionRecorded) {
        onActionRecorded(historyItem);
      }

      await carregarInventarioCompleto(true);
      handleCancelEdit();
      toast.success("Item atualizado e registrado.");
    } catch {
      logger.warn('Falha ao atualizar item de inventario.');
      toast.error("Erro ao salvar alterações.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = fullInventory.find(i => i.id === id);
    if (!item || !unidadeId) return;
    
    try {
      const historyItem = await deleteInventoryItemWithAudit({
        unidadeId,
        item,
      });

      if (onActionRecorded) {
        onActionRecorded(historyItem);
      }

      await carregarInventarioCompleto(true);
      toast.success("Item removido e exclusão registrada.");
    } catch {
      logger.warn('Falha ao excluir item de inventario.');
      toast.error("Erro ao excluir item.");
    }
  };

  const handleConsumeItem = async (item: InventoryItem) => {
    if (item.quantidade <= 0) {
      toast.error("Quantidade já está em zero.");
      return;
    }
    try {
      if (!unidadeId) return;
      const historyItem = await consumeInventoryItemWithAudit({
        unidadeId,
        item,
      });

      if (onActionRecorded) {
        onActionRecorded(historyItem);
      }

      toast.success(`Consumido 1 unid. de ${item.nome}`, {
        action: {
          label: "Desfazer",
          onClick: () => handleUndoConsume(item)
        }
      });
      await carregarInventarioCompleto(true);
    } catch {
      logger.warn('Falha ao registrar consumo de item.');
      toast.error("Erro ao registrar consumo.");
    }
  };

  const handleUndoConsume = async (item: InventoryItem) => {
    try {
      if (!unidadeId) return;
      const historyItem = await undoConsumeInventoryItemWithAudit({
        unidadeId,
        item,
      });

      if (onActionRecorded) {
        onActionRecorded(historyItem);
      }

      toast.success("Consumo desfeito e registrado.");
      await carregarInventarioCompleto(true);
    } catch {
      logger.warn('Falha ao desfazer consumo de item.');
      toast.error("Não foi possível desfazer.");
    }
  };

  return {
    fullInventory,
    isInventoryLoading,
    searchTerm,
    setSearchTerm: updateSearchTerm,
    categoryFilter,
    setCategoryFilter,
    roomFilter,
    setRoomFilter,
    expiryFilter,
    setExpiryFilter,
    inventoryPage,
    setInventoryPage,
    inventoryPageSize,
    setInventoryPageSize: updateInventoryPageSize,
    inventoryTotal,
    clearInventoryFilters,
    editingItemId,
    editingItemData,
    setEditingItemData,
    carregarInventarioCompleto,
    handleStartEdit,
    handleCancelEdit,
    handleUpdateItem,
    handleDeleteItem,
    handleConsumeItem
  };
}
