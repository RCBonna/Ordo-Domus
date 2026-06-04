import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryDataFromReceipt } from '../services/geminiService';
import { compressImage, getErrorMessage } from '../lib/utils';
import { logger } from '../lib/logger';
import { toast } from 'sonner';
import type { AiConsentScope } from './useAiConsent';

type EnsureAiConsent = (scope: AiConsentScope) => Promise<boolean>;

export function useReceiptImport(
  unidadeId: string | undefined,
  onImportSuccess?: () => void,
  ensureAiConsent?: EnsureAiConsent,
) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !unidadeId) return;

    // Reset input
    event.target.value = '';

    await importReceiptFile(file);
  };

  const importReceiptFile = async (file: File, options: { forceDuplicate?: boolean } = {}) => {
    if (!unidadeId) return;

    const consentAccepted = await ensureAiConsent?.('receipt') ?? true;
    if (!consentAccepted) {
      toast.warning('Para importar cupom com IA, aceite o consentimento de envio.', { id: 'import-receipt' });
      return;
    }

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
        .gt('expires_at', new Date().toISOString())
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

      if (!options.forceDuplicate) {
        const importHistory = await fetchReceiptImportHistory(unidadeId, cupomHash);
        if (importHistory) {
          toast.warning(`Este cupom já foi importado em ${formatImportedAt(importHistory.primeiro_importado_em)}.`, {
            id: 'import-receipt',
            duration: 15000,
            action: {
              label: 'Importar novamente',
              onClick: () => {
                void importReceiptFile(file, { forceDuplicate: true });
              },
            },
          });
          setIsImporting(false);
          return;
        }
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
        try {
          await recordReceiptImportHistory(unidadeId, cupomHash);
        } catch {
          logger.warn('Falha ao registrar historico de importacao de cupom.');
        }
        logger.info('Importacao de cupom concluida.');
        toast.success(`Cupom importado! ${data.length} itens aguardando triagem. Mova o arquivo para sua pasta de importados.`, { id: 'import-receipt' });
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

interface ReceiptImportHistory {
  id: string;
  primeiro_importado_em: string;
  ultimo_importado_em: string;
}

function isMissingReceiptHistoryTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() || '';
  return error?.code === 'PGRST205'
    || error?.code === 'PGRST204'
    || message.includes('importacoes_cupons');
}

async function fetchReceiptImportHistory(unidadeId: string, cupomHash: string): Promise<ReceiptImportHistory | null> {
  const { data, error } = await supabase
    .from('importacoes_cupons')
    .select('id,primeiro_importado_em,ultimo_importado_em')
    .eq('unidade_id', unidadeId)
    .eq('cupom_hash', cupomHash)
    .order('ultimo_importado_em', { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingReceiptHistoryTable(error)) {
      logger.warn('Historico de importacao de cupons ainda indisponivel; seguindo sem aviso de cupom ja triado.');
      return null;
    }
    throw error;
  }

  return data?.[0] || null;
}

async function recordReceiptImportHistory(unidadeId: string, cupomHash: string) {
  const importedAt = new Date().toISOString();
  const existing = await fetchReceiptImportHistory(unidadeId, cupomHash);

  if (existing) {
    const { error } = await supabase
      .from('importacoes_cupons')
      .update({
        ultimo_importado_em: importedAt,
        atualizado_em: importedAt,
      })
      .eq('id', existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('importacoes_cupons')
    .insert({
      unidade_id: unidadeId,
      cupom_hash: cupomHash,
      primeiro_importado_em: importedAt,
      ultimo_importado_em: importedAt,
      atualizado_em: importedAt,
    });

  if (error) {
    if (isMissingReceiptHistoryTable(error)) {
      logger.warn('Historico de importacao de cupons ainda indisponivel; hash nao registrado.');
      return;
    }
    throw error;
  }
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
