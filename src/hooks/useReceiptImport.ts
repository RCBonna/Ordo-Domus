import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryDataFromReceipt } from '../services/geminiService';
import { compressImage, getErrorMessage } from '../lib/utils';
import { logger } from '../lib/logger';
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
      const cupomHash = await sha256Hex(base64Data);

      const { data: existingImport, error: existingImportError } = await supabase
        .from('importacoes_pendentes')
        .select('id,cupom_importado_em,criado_em')
        .eq('unidade_id', unidadeId)
        .eq('cupom_hash', cupomHash)
        .order('cupom_importado_em', { ascending: false })
        .limit(1);

      const isMissingHashColumn =
        existingImportError?.code === 'PGRST204' ||
        existingImportError?.message?.toLowerCase().includes('cupom_hash');

      if (!isMissingHashColumn && existingImportError) {
        throw existingImportError;
      }

      if (!isMissingHashColumn && existingImport && existingImport.length > 0) {
        const importedAt = existingImport[0].cupom_importado_em || existingImport[0].criado_em;
        toast.warning(`Este cupom já está pendente desde ${formatImportedAt(importedAt)}.`, { id: 'import-receipt' });
        setIsImporting(false);
        return;
      }
      
      // 2. OCR with Gemini
      toast.loading('Extraindo itens com IA...', { id: 'import-receipt' });
      const extractedItems = await extractInventoryDataFromReceipt(base64Data, mimeType, unidadeId);
      
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
        categoria_sugerida: item.categoria || null,
        cupom_hash: cupomHash,
        cupom_importado_em: new Date().toISOString(),
        quantidade: item.quantidade || 1,
        valor_unitario: item.valor || null,
        processado: false
      }));

      // Primeiro verificar se temos sessão ativa
      const { data: session } = await supabase.auth.getSession();
      logger.debug(session?.session ? 'Sessao ativa para importacao de cupom.' : 'Sessao ausente na importacao de cupom.');

      let { data, error } = await supabase
        .from('importacoes_pendentes')
        .insert(rowsToInsert)
        .select();

      const isMissingSuggestedCategoryColumn =
        error?.code === 'PGRST204' ||
        error?.message?.toLowerCase().includes('categoria_sugerida') ||
        error?.message?.toLowerCase().includes('cupom_hash') ||
        error?.message?.toLowerCase().includes('cupom_importado_em');

      if (isMissingSuggestedCategoryColumn) {
        logger.warn('Colunas novas da importacao de cupom indisponiveis; salvando com fallback.');
        const rowsWithoutNewColumns = rowsToInsert.map(({
          categoria_sugerida: _categoria,
          cupom_hash: _hash,
          cupom_importado_em: _importedAt,
          ...row
        }) => row);
        const retry = await supabase
          .from('importacoes_pendentes')
          .insert(rowsWithoutNewColumns)
          .select();

        data = retry.data;
        error = retry.error;
      }

      if (error) {
        logger.warn('Falha ao inserir importacoes pendentes.');
        toast.error(`Erro: ${error.message || 'Falha ao salvar'}`, { id: 'import-receipt' });
      } else if (!data || data.length === 0) {
        logger.warn('Importacao de cupom retornou sem dados inseridos.');
        toast.warning('Os itens podem não ter sido salvos. Verifique as permissões.', { id: 'import-receipt' });
      } else {
        logger.info('Importacao de cupom concluida.');
        toast.success(`Cupom importado! ${data.length} itens aguardando triagem.`, { id: 'import-receipt' });
        onImportSuccess?.();
      }
    } catch (error: unknown) {
      logger.warn('Falha inesperada ao importar cupom.');
      const msg = getErrorMessage(error, 'Erro desconhecido ao processar imagem.');
      toast.error(msg, { id: 'import-receipt' });
    } finally {
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

function formatImportedAt(value?: string | null) {
  if (!value) return 'data/hora anterior não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
