import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatarTexto, formatarData } from '../lib/utils';
import { toast } from 'sonner';

export function useInventory(unidadeId: string | undefined, onActionRecorded?: (item: any) => void) {
  const [fullInventory, setFullInventory] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<any>(null);

  const carregarInventarioCompleto = async (silent = false) => {
    if (!unidadeId) return;
    if (!silent) setIsInventoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_inventario')
        .select('*')
        .eq('unidade_id', unidadeId)
        .order('nome', { ascending: true });

      if (error) throw error;
      setFullInventory(data || []);
    } catch (err) {
      console.error('Erro ao carregar inventário:', err);
    } finally {
      if (!silent) setIsInventoryLoading(false);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditingItemData({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItemData(null);
  };

  const handleUpdateItem = async () => {
    if (!editingItemId || !editingItemData) return;
    
    // Buscar dados atuais para comparar se houve mudança de quantidade
    const originalItem = fullInventory.find(i => i.id === editingItemId);
    const qtdMudou = originalItem && Number(originalItem.quantidade) !== Number(editingItemData.quantidade);
    const diff = qtdMudou ? Number(editingItemData.quantidade) - Number(originalItem.quantidade) : 0;

    try {
      const { error } = await supabase
        .from('itens_inventario')
        .update({
          nome: formatarTexto(editingItemData.nome),
          categoria: formatarTexto(editingItemData.categoria),
          comodo: formatarTexto(editingItemData.comodo),
          armario: formatarTexto(editingItemData.armario),
          caixa: formatarTexto(editingItemData.caixa),
          quantidade: editingItemData.quantidade,
          validade: formatarData(editingItemData.validade)
        })
        .eq('id', editingItemId);
      if (error) throw error;

      // REGISTRO DE AUDITORIA: AJUSTE/EDIÇÃO
      await supabase
        .from('movimentacoes_inventario')
        .insert({
          unidade_id: unidadeId,
          item_id: editingItemId,
          item_nome: editingItemData.nome,
          categoria: editingItemData.categoria,
          comodo: editingItemData.comodo,
          quantidade: qtdMudou ? Math.abs(diff) : 0,
          tipo: qtdMudou ? (diff > 0 ? 'entrada' : 'consumo') : 'ajuste'
        });

      if (onActionRecorded) {
        onActionRecorded({
          item: editingItemData.nome,
          categoria: editingItemData.categoria,
          comodo: editingItemData.comodo,
          quantidade: qtdMudou ? Math.abs(diff) : 0,
          tipo: qtdMudou ? (diff > 0 ? 'entrada' : 'consumo') : 'ajuste'
        });
      }

      await carregarInventarioCompleto(true);
      handleCancelEdit();
      toast.success("Item atualizado e registrado.");
    } catch (err) {
      console.error("Erro ao atualizar item:", err);
      toast.error("Erro ao salvar alterações.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = fullInventory.find(i => i.id === id);
    if (!item) return;
    
    try {
      // 1. Logar a exclusão antes de deletar o item (pela integridade do histórico)
      await supabase
        .from('movimentacoes_inventario')
        .insert({
          unidade_id: unidadeId,
          item_id: id,
          item_nome: item.nome,
          categoria: item.categoria,
          comodo: item.comodo,
          quantidade: item.quantidade,
          tipo: 'exclusao'
        });

      if (onActionRecorded) {
        onActionRecorded({
          item: item.nome,
          categoria: item.categoria,
          comodo: item.comodo,
          quantidade: item.quantidade,
          tipo: 'exclusao'
        });
      }

      // 2. Deletar o item
      const { error } = await supabase.from('itens_inventario').delete().eq('id', id);
      if (error) throw error;
      
      await carregarInventarioCompleto(true);
      toast.success("Item removido e exclusão registrada.");
    } catch (err) {
      console.error("Erro ao deletar item:", err);
      toast.error("Erro ao excluir item.");
    }
  };

  const handleConsumeItem = async (item: any) => {
    if (item.quantidade <= 0) {
      toast.error("Quantidade já está em zero.");
      return;
    }
    const novaQtd = Number(item.quantidade) - 1;
    try {
      const { error } = await supabase
        .from('itens_inventario')
        .update({ quantidade: novaQtd })
        .eq('id', item.id);
      if (error) throw error;

      await supabase
        .from('movimentacoes_inventario')
        .insert({
          unidade_id: unidadeId,
          item_id: item.id,
          item_nome: item.nome,
          categoria: item.categoria,
          comodo: item.comodo,
          quantidade: 1,
          tipo: 'consumo'
        });

      if (onActionRecorded) {
        onActionRecorded({
          item: item.nome,
          categoria: item.categoria,
          comodo: item.comodo,
          quantidade: 1,
          tipo: 'consumo'
        });
      }

      toast.success(`Consumido 1 unid. de ${item.nome}`, {
        action: {
          label: "Desfazer",
          onClick: () => handleUndoConsume(item)
        }
      });
      await carregarInventarioCompleto(true);
    } catch (err) {
      console.error("Erro ao consumir item:", err);
      toast.error("Erro ao registrar consumo.");
    }
  };

  const handleUndoConsume = async (item: any) => {
    try {
      const novaQtd = Number(item.quantidade); // Volta para o valor original antes do consumo
      const { error } = await supabase
        .from('itens_inventario')
        .update({ quantidade: novaQtd })
        .eq('id', item.id);
      if (error) throw error;

      // Registrar o estorno
      await supabase
        .from('movimentacoes_inventario')
        .insert({
          unidade_id: unidadeId,
          item_id: item.id,
          item_nome: item.nome,
          categoria: item.categoria,
          comodo: item.comodo,
          quantidade: 1,
          tipo: 'entrada' // Estorno é uma entrada
        });

      if (onActionRecorded) {
        onActionRecorded({
          item: item.nome,
          categoria: item.categoria,
          comodo: item.comodo,
          quantidade: 1,
          tipo: 'entrada'
        });
      }

      toast.success("Consumo desfeito e registrado.");
      await carregarInventarioCompleto(true);
    } catch (err) {
      console.error("Erro ao desfazer consumo:", err);
      toast.error("Não foi possível desfazer.");
    }
  };

  return {
    fullInventory,
    isInventoryLoading,
    searchTerm,
    setSearchTerm,
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
