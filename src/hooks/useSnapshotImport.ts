import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { compressImage, getErrorMessage } from '../lib/utils';
import { logger } from '../lib/logger';
import {
  extractInventoryDataFromSnapshot,
  type SnapshotContext,
} from '../services/geminiService';
import type { AiConsentScope } from './useAiConsent';

type EnsureAiConsent = (scope: AiConsentScope) => Promise<boolean>;

const SNAPSHOT_MAX_WIDTH = 1400;
const SNAPSHOT_MAX_HEIGHT = 1600;

export function useSnapshotImport(
  unidadeId: string | undefined,
  onImportSuccess?: () => void,
  ensureAiConsent?: EnsureAiConsent,
) {
  const [isSnapshotImporting, setIsSnapshotImporting] = useState(false);
  const [snapshotContext, setSnapshotContext] = useState<SnapshotContext>({
    comodo: '',
    armario: '',
    caixa: '',
  });
  const snapshotFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportSnapshot = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !unidadeId) return;

    event.target.value = '';
    await importSnapshotFile(file);
  };

  const importSnapshotFile = async (file: File) => {
    if (!unidadeId) return;

    const consentAccepted = await ensureAiConsent?.('snapshot') ?? true;
    if (!consentAccepted) {
      toast.warning('Para usar Inventário por Foto, aceite o consentimento de envio.', { id: 'import-snapshot' });
      return;
    }

    setIsSnapshotImporting(true);

    try {
      toast.info('Processando foto do local...', { id: 'import-snapshot' });

      const base64DataUrl = await compressImage(file, SNAPSHOT_MAX_WIDTH, SNAPSHOT_MAX_HEIGHT);
      const mimeType = 'image/webp';
      const imageBase64 = base64DataUrl.split(',')[1];
      const sourceHash = await sha256Hex(imageBase64);
      const importedAt = new Date().toISOString();
      const normalizedContext = normalizeContext(snapshotContext);

      const { data: existingImport, error: existingImportError } = await supabase
        .from('importacoes_pendentes')
        .select('id,source_importado_em,criado_em')
        .eq('unidade_id', unidadeId)
        .eq('origem', 'snapshot')
        .eq('source_hash', sourceHash)
        .gt('expires_at', new Date().toISOString())
        .order('source_importado_em', { ascending: false })
        .limit(1);

      if (existingImportError) throw existingImportError;

      if (existingImport && existingImport.length > 0) {
        const previousImportAt = existingImport[0].source_importado_em || existingImport[0].criado_em;
        toast.warning(`Esta foto já está pendente desde ${formatImportedAt(previousImportAt)}.`, { id: 'import-snapshot' });
        return;
      }

      toast.loading('Identificando itens com IA...', { id: 'import-snapshot' });
      const extractedItems = await extractInventoryDataFromSnapshot(imageBase64, mimeType, unidadeId, normalizedContext);

      const validItems = (extractedItems || [])
        .filter((item) => item.item?.trim())
        .map((item) => ({
          ...item,
          quantidade: Math.max(1, Number(item.quantidade) || 1),
          confianca: normalizeConfidence(item.confianca),
        }));

      if (validItems.length === 0) {
        toast.error('Nenhum item claro foi identificado na foto.', { id: 'import-snapshot' });
        return;
      }

      toast.loading(`Salvando ${validItems.length} itens para triagem...`, { id: 'import-snapshot' });

      const rowsToInsert = validItems.map((item) => ({
        unidade_id: unidadeId,
        nome_bruto: item.item.trim(),
        categoria_sugerida: item.categoria || null,
        quantidade: item.quantidade,
        valor_unitario: null,
        processado: false,
        origem: 'snapshot',
        source_hash: sourceHash,
        source_importado_em: importedAt,
        source_metadata: {
          context: normalizedContext,
          marca: item.marca || null,
          codigo_barras: item.codigo_barras || null,
          observacao: item.observacao || null,
        },
        confianca: item.confianca,
        validade_sugerida: item.validade || null,
        comodo_sugerido: item.comodo || normalizedContext.comodo || null,
        armario_sugerido: item.armario || normalizedContext.armario || null,
        caixa_sugerida: item.caixa || normalizedContext.caixa || null,
      }));

      const { data, error } = await supabase
        .from('importacoes_pendentes')
        .insert(rowsToInsert)
        .select();

      if (error) {
        logger.warn('Falha ao inserir itens de Inventario por Foto.');
        toast.error(error.message || 'Falha ao salvar itens da foto.', { id: 'import-snapshot' });
        return;
      }

      if (!data || data.length === 0) {
        logger.warn('Inventario por Foto retornou sem linhas inseridas.');
        toast.warning('Os itens podem não ter sido salvos. Verifique as permissões.', { id: 'import-snapshot' });
        return;
      }

      logger.info('Inventario por Foto importado para triagem.');
      toast.success(`Inventário por Foto importado! ${data.length} itens aguardando triagem.`, { id: 'import-snapshot' });
      onImportSuccess?.();
    } catch (error: unknown) {
      logger.warn('Falha inesperada no Inventario por Foto.');
      toast.error(getErrorMessage(error, 'Erro desconhecido ao processar foto.'), { id: 'import-snapshot' });
    } finally {
      setIsSnapshotImporting(false);
    }
  };

  const triggerSnapshotImport = () => {
    snapshotFileInputRef.current?.click();
  };

  return {
    isSnapshotImporting,
    snapshotFileInputRef,
    handleImportSnapshot,
    triggerSnapshotImport,
    snapshotContext,
    setSnapshotContext,
  };
}

function normalizeContext(context: SnapshotContext): SnapshotContext {
  return {
    comodo: context.comodo?.trim() || '',
    armario: context.armario?.trim() || '',
    caixa: context.caixa?.trim() || '',
  };
}

function normalizeConfidence(value: unknown) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return null;
  return Math.max(0, Math.min(1, confidence));
}

function formatImportedAt(value?: string | null) {
  if (!value) return 'data/hora anterior não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
