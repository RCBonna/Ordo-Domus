import { supabase } from '../lib/supabaseClient';
import { addBreadcrumb, measureAsync } from '../lib/observability';
import type { MovementType } from '../types/domain';

export interface ExtractedItem {
  item: string;
  categoria: string;
  comodo: string;
  armario: string;
  caixa: string;
  validade: string;
  quantidade: number;
  tipo?: MovementType;
  data?: string;
  transcricao?: string;
  triage_id?: string;
}

export interface ExtractedReceiptItem {
  item: string;
  categoria?: string;
  quantidade: number;
  valor?: number;
}

type ExtractionMode = 'text' | 'audio' | 'receipt';

async function invokeExtraction<T>(mode: ExtractionMode, payload: Record<string, unknown>): Promise<T> {
  addBreadcrumb('extract-inventory invoked', { mode });

  const { data, error } = await measureAsync(
    'extract-inventory',
    'edge.function',
    async () => await supabase.functions.invoke('extract-inventory', {
      body: {
        mode,
        ...payload,
      },
    }),
    { mode },
  );

  if (error) {
    throw new Error(error.message || 'Falha ao chamar extração por IA.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.result) {
    throw new Error('Resposta vazia da função de extração.');
  }

  return data.result as T;
}

export async function extractInventoryData(text: string, unidadeId: string): Promise<ExtractedItem> {
  return invokeExtraction<ExtractedItem>('text', {
    unidadeId,
    text,
  });
}

export async function extractInventoryDataFromAudio(
  audioBase64: string,
  mimeType: string,
  unidadeId: string,
): Promise<ExtractedItem> {
  return invokeExtraction<ExtractedItem>('audio', {
    unidadeId,
    audioBase64,
    mimeType,
  });
}

export async function extractInventoryDataFromReceipt(
  imageBase64: string,
  mimeType: string,
  unidadeId: string,
): Promise<ExtractedReceiptItem[]> {
  return invokeExtraction<ExtractedReceiptItem[]>('receipt', {
    unidadeId,
    imageBase64,
    mimeType,
  });
}
