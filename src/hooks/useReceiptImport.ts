import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryDataFromReceipt } from '../services/geminiService';
import { compressImage } from '../lib/utils';
import { toast } from 'sonner';

export function useReceiptImport(unidadeId: string | undefined, onImportSuccess?: () => void) {
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

      console.log("[useReceiptImport] Tentando inserir linhas:", JSON.stringify(rowsToInsert, null, 2));

      // Primeiro verificar se temos sessão ativa
      const { data: session } = await supabase.auth.getSession();
      console.log("[useReceiptImport] Sessão ativa?", !!session?.session, "User ID:", session?.session?.user?.id);

      const { data, error, status, statusText } = await supabase
        .from('importacoes_pendentes')
        .insert(rowsToInsert)
        .select();
        
      console.log("[useReceiptImport] Resposta completa:", { 
        data, 
        error, 
        status, 
        statusText,
        dataLength: data?.length,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint
      });

      if (error) {
        console.error("[useReceiptImport] Erro ao inserir importações pendentes:", JSON.stringify(error, null, 2));
        toast.error(`Erro: ${error.message || 'Falha ao salvar'}`, { id: 'import-receipt' });
      } else if (!data || data.length === 0) {
        console.warn("[useReceiptImport] INSERT retornou sem dados — possível bloqueio RLS silencioso");
        toast.warning('Os itens podem não ter sido salvos. Verifique as permissões.', { id: 'import-receipt' });
      } else {
        console.log("[useReceiptImport] Sucesso! Inseridos:", data.length, "itens");
        toast.success(`Cupom importado! ${data.length} itens aguardando triagem.`, { id: 'import-receipt' });
        onImportSuccess?.();
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
