import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryDataFromReceipt } from '../services/geminiService';
import { compressImage } from '../lib/utils';
import { toast } from 'sonner';

export function useReceiptImport(unidadeId: string | undefined) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !unidadeId) return;

    // Reset input
    event.target.value = '';
    
    setIsImporting(true);
    try {
      toast.info('Processando imagem do cupom...', { id: 'import-receipt' });
      
      // 1. Compress Image
      const base64DataUrl = await compressImage(file, 800);
      const mimeType = 'image/webp';
      const base64Data = base64DataUrl.split(',')[1];
      
      // 2. OCR with Gemini
      toast.loading('Extraindo itens com IA...', { id: 'import-receipt' });
      const extractedItems = await extractInventoryDataFromReceipt(base64Data, mimeType);
      
      if (!extractedItems || extractedItems.length === 0) {
        toast.error('Nenhum item encontrado no cupom.', { id: 'import-receipt' });
        setIsImporting(false);
        return;
      }
      
      toast.loading(`Salvando ${extractedItems.length} itens...`, { id: 'import-receipt' });
      
      // 3. Save to importacoes_pendentes
      const rowsToInsert = extractedItems.map(item => ({
        unidade_id: unidadeId,
        nome_bruto: item.item || 'Item sem nome',
        quantidade: item.quantidade || 1,
        valor_unitario: item.valor || null,
        processado: false
      }));

      console.log("[useReceiptImport] Tentando inserir linhas:", rowsToInsert);

      const { data, error } = await supabase
        .from('importacoes_pendentes')
        .insert(rowsToInsert)
        .select();
        
      console.log("[useReceiptImport] Resposta do insert:", { data, error });

      if (error) {
        console.error("[useReceiptImport] Erro ao inserir importações pendentes", error);
        toast.error('Erro ao salvar os itens extraídos.', { id: 'import-receipt' });
      } else {
        console.log("[useReceiptImport] Sucesso! Inseridos:", data);
        toast.success('Cupom importado com sucesso! Aguardando Triagem.', { id: 'import-receipt' });
      }
    } catch (error: any) {
      console.error("[useReceiptImport] Exceção capturada:", error);
      const msg = typeof error?.message === 'string' ? error.message : 'Erro desconhecido ao processar imagem.';
      toast.error(msg, { id: 'import-receipt' });
    } finally {
      console.log("[useReceiptImport] Finalizando processo de importação");
      setIsImporting(false);
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  return {
    isImporting,
    fileInputRef,
    handleImportReceipt,
    triggerImport
  };
}
