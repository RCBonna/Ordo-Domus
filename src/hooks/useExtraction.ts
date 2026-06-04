import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryData, extractInventoryDataFromAudio, type ExtractedItem } from '../services/geminiService';
import { formatarTexto, formatarData, getErrorMessage, normalizarCategoria } from '../lib/utils';
import { logger } from '../lib/logger';
import { getCurrentUserId } from '../repositories/authRepository';
import { finalizeReceiptImportItem, upsertInventoryItem } from '../repositories/inventoryRepository';
import { fetchRecentInventoryMovements, insertInventoryMovement } from '../repositories/movementRepository';
import type { HistoryItem } from '../types/domain';
import type { AiConsentScope } from './useAiConsent';

const MAX_RECORDING_SECONDS = 60;
const MIN_AUDIO_BYTES = 1000;

type EnsureAiConsent = (scope: AiConsentScope) => Promise<boolean>;

export function useExtraction(unidadeId: string | undefined, ensureAiConsent?: EnsureAiConsent) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAudioCaptureSupported, setIsAudioCaptureSupported] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractedItem | null>(null);
  const [mergeStatus, setMergeStatus] = useState<{ action: 'MERGE' | 'ADD', message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExtractedItem[]>([]);
  
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const maxRecordingTimeoutRef = useRef<number | null>(null);
  const shouldProcessAudioRef = useRef(true);

  const clearRecordingTimers = () => {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (maxRecordingTimeoutRef.current !== null) {
      window.clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
    }
  };

  const stopAudioTracks = () => {
    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current = null;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording(true);
      return;
    }

    try {
      const consentAccepted = await ensureAiConsent?.('audio') ?? true;
      if (!consentAccepted) {
        setError('Para usar áudio com IA, aceite o consentimento de envio.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setIsAudioCaptureSupported(false);
        setError('Captura de áudio não suportada neste navegador.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
        
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      shouldProcessAudioRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        logger.warn('Falha no MediaRecorder.');
        setError('Erro ao gravar áudio. Tente novamente.');
        stopRecording(false);
      };

      mediaRecorder.onstop = async () => {
        const shouldProcessAudio = shouldProcessAudioRef.current;
        clearRecordingTimers();
        stopAudioTracks();
        setIsRecording(false);
        mediaRecorderRef.current = null;
        
        if (!shouldProcessAudio) {
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || mediaRecorder.mimeType || 'audio/webm' });

        if (audioBlob.size < MIN_AUDIO_BYTES) {
          setError("O áudio gravado está vazio. Verifique seu microfone.");
          return;
        }

        // Processar o áudio automaticamente após parar
        await handleAudioExtraction(audioBlob, mimeType);
      };

      mediaRecorder.start(1000); // Enviar dados a cada 1 segundo
      setRecordingSeconds(0);
      setIsRecording(true);
      setError(null);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => Math.min(MAX_RECORDING_SECONDS, current + 1));
      }, 1000);
      maxRecordingTimeoutRef.current = window.setTimeout(() => {
        stopRecording(true);
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      logger.warn('Falha ao acessar microfone.');
      setError("Não foi possível acessar o microfone.");
      clearRecordingTimers();
      stopAudioTracks();
      setIsRecording(false);
    }
  };

  const stopRecording = (processAudio: boolean) => {
    shouldProcessAudioRef.current = processAudio;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    clearRecordingTimers();
    stopAudioTracks();
    setIsRecording(false);
  };

  const handleAudioExtraction = async (blob: Blob, mimeType: string) => {
    if (!unidadeId) return;
    setIsExtracting(true);
    setError(null);
    
    try {
      // Converter blob para base64
      const base64Data = await blobToBase64(blob);

      const dataRaw = await extractInventoryDataFromAudio(base64Data, mimeType, unidadeId);
      await processExtractionResult(dataRaw);
    } catch (err: unknown) {
      logger.warn('Falha ao processar extracao por audio.');
      setError(getExtractionErrorMessage(err, "Erro ao processar áudio. Tente falar de forma mais clara ou usar texto."));
    } finally {
      setIsExtracting(false);
    }
  };

  const processExtractionResult = async (dataRaw: ExtractedItem) => {
    if (!unidadeId) return;

    const data: ExtractedItem = {
      item: formatarTexto(dataRaw.item) || 'Item sem nome',
      categoria: normalizarCategoria(dataRaw.categoria) || 'Geral',
      comodo: formatarTexto(dataRaw.comodo) || 'Não informado',
      armario: formatarTexto(dataRaw.armario) || '',
      caixa: formatarTexto(dataRaw.caixa) || '',
      validade: formatarData(dataRaw.validade) || '',
      quantidade: Number(dataRaw.quantidade) || 1,
      transcricao: dataRaw.transcricao
    };
    
    setCurrentResult(data);
    setIsPendingConfirmation(true);
    setMergeStatus(null);
    setError(null);
    
    if (data.transcricao) {
      setInput(data.transcricao);
    }
  };

  const confirmAndSave = async (editedData: ExtractedItem) => {
    if (!unidadeId) return;
    setIsSaving(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();
      const normalizedEditedData: ExtractedItem = {
        ...editedData,
        validade: formatarData(editedData.validade) || '',
      };
      logger.debug('Iniciando gravacao de extracao no inventario.');

      const dbPromise = (async () => {
        let finalizedByRpc = false;
        let resultado = null;

        if (editedData.triage_id) {
          try {
            resultado = await finalizeReceiptImportItem({
              importacaoId: normalizedEditedData.triage_id,
              nome: normalizedEditedData.item,
              categoria: normalizedEditedData.categoria,
              comodo: normalizedEditedData.comodo,
              armario: normalizedEditedData.armario,
              caixa: normalizedEditedData.caixa,
              quantidade: normalizedEditedData.quantidade,
              validade: normalizedEditedData.validade,
            });
            finalizedByRpc = true;
          } catch {
            logger.warn('RPC de efetivacao de cupom indisponivel; usando fluxo client-side.');
          }
        }

        if (!resultado) {
          resultado = await upsertInventoryItem({
            unidadeId,
            nome: normalizedEditedData.item,
            categoria: normalizedEditedData.categoria,
            comodo: normalizedEditedData.comodo,
            armario: normalizedEditedData.armario,
            caixa: normalizedEditedData.caixa,
            quantidade: normalizedEditedData.quantidade,
            validade: normalizedEditedData.validade
          });
        }
        logger.debug('RPC de upsert do inventario concluida.');
        
        const acaoFinal = resultado?.acao as 'MERGE' | 'ADD' || 'ADD';
        const mensagem = acaoFinal === 'MERGE'
          ? 'A quantidade foi somada a um item existente!'
          : 'Item gravado com sucesso no inventário!';
        
        const itemNaTela: ExtractedItem = {
          item: resultado?.nome || normalizedEditedData.item,
          categoria: resultado?.categoria || normalizedEditedData.categoria,
          comodo: resultado?.comodo || normalizedEditedData.comodo,
          armario: resultado?.armario || normalizedEditedData.armario,
          caixa: resultado?.caixa || normalizedEditedData.caixa,
          validade: resultado?.validade || normalizedEditedData.validade || '',
          quantidade: Number(normalizedEditedData.quantidade),
          tipo: 'entrada',
          transcricao: normalizedEditedData.transcricao,
          data: new Date().toISOString()
        };

        if (!finalizedByRpc) {
          // Gravar no histórico do banco
          try {
            await insertInventoryMovement({
              unidade_id: unidadeId,
              item_nome: itemNaTela.item,
              categoria: itemNaTela.categoria,
              comodo: itemNaTela.comodo,
              quantidade: itemNaTela.quantidade,
              tipo: 'entrada',
              user_id: userId
            });
            logger.debug('Historico de inventario gravado.');
          } catch {
            logger.warn('Falha ao gravar historico de inventario.');
          }
        }

        if (normalizedEditedData.triage_id && !finalizedByRpc) {
          const { error: errTriage } = await supabase
            .from('importacoes_pendentes')
            .delete()
            .eq('id', normalizedEditedData.triage_id);
            
          if (errTriage) logger.warn('Falha ao remover item da triagem.');

          if (normalizedEditedData.transcricao) {
            const { error: errDict } = await supabase
              .from('dicionario_produtos')
              .upsert({
                unidade_id: unidadeId,
                nome_bruto_cupom: normalizedEditedData.transcricao,
                nome_oficial_inventario: normalizedEditedData.item,
                categoria: normalizedEditedData.categoria,
                comodo: normalizedEditedData.comodo
              }, { onConflict: 'unidade_id, nome_bruto_cupom' });
              
            if (errDict) logger.warn('Falha ao atualizar dicionario de produtos.');
          }
        }

        return { itemNaTela, acaoFinal, mensagem };
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: O banco de dados demorou muito para responder.')), 10000)
      );

      const dbResult = await Promise.race([dbPromise, timeoutPromise]) as {
        itemNaTela: ExtractedItem;
        acaoFinal: 'MERGE' | 'ADD';
        mensagem: string;
      };

      setHistory(prev => [dbResult.itemNaTela, ...prev]);
      setMergeStatus({ action: dbResult.acaoFinal, message: dbResult.mensagem });
      
      setCurrentResult(dbResult.itemNaTela);
      setIsPendingConfirmation(false);
      
      if (!normalizedEditedData.transcricao) {
         setInput('');
      }
    } catch (err: unknown) {
      logger.warn('Falha ao salvar extracao no banco.');
      setError(`Erro ao salvar no BD: ${getErrorMessage(err, 'Desconhecido')}`);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelConfirmation = () => {
    setIsPendingConfirmation(false);
    setCurrentResult(null);
    setMergeStatus(null);
    setError(null);
  };

  const handleExtract = async () => {
    if (!input.trim() || !unidadeId) return;
    const consentAccepted = await ensureAiConsent?.('text') ?? true;
    if (!consentAccepted) {
      setError('Para usar texto com IA, aceite o consentimento de envio.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setCurrentResult(null);
    setMergeStatus(null);
    setIsPendingConfirmation(false);
    try {
      const dataRaw = await extractInventoryData(input, unidadeId);
      await processExtractionResult(dataRaw);
      // Removed setInput('') from here because processExtractionResult now handles it.
    } catch (err: unknown) {
      logger.warn('Falha ao extrair dados de inventario.');
      setError(getExtractionErrorMessage(err, 'Erro ao processar. Verifique a conexão.'));
    } finally {
      setIsExtracting(false);
    }
  };

  const carregarHistorico = async () => {
    if (!unidadeId) return;
    try {
      const historyItems = await fetchRecentInventoryMovements(unidadeId, 50);
      setHistory(historyItems.map(item => ({
        item: item.item,
        categoria: item.categoria,
        comodo: item.comodo,
        quantidade: item.quantidade,
        tipo: item.tipo,
        data: item.data,
        armario: item.armario || '',
        caixa: item.caixa || '',
        validade: item.validade || '',
      })));
    } catch {
      logger.warn('Falha ao carregar historico de movimentacoes.');
    }
  };

  useEffect(() => {
    if (unidadeId) carregarHistorico();
  }, [unidadeId]);

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setMergeStatus(null);
    setIsPendingConfirmation(false);
  };

  const addHistoryItem = (item: HistoryItem) => {
    setHistory(prev => [{
      item: item.item,
      categoria: item.categoria,
      comodo: item.comodo,
      quantidade: item.quantidade,
      tipo: item.tipo,
      data: item.data,
      transcricao: item.transcricao,
      armario: item.armario || '',
      caixa: item.caixa || '',
      validade: item.validade || ''
    }, ...prev]);
  };

  useEffect(() => {
    setIsAudioCaptureSupported(Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined');

    return () => {
      stopRecording(false);
    };
  }, []);

  return {
    input, setInput,
    isRecording, recordingSeconds, isAudioCaptureSupported, toggleRecording,
    isExtracting, handleExtract,
    currentResult, setCurrentResult,
    isPendingConfirmation, setIsPendingConfirmation, isSaving, confirmAndSave, cancelConfirmation,
    mergeStatus, error,
    history, setHistory, handleClearHistory,
    addHistoryItem,
    carregarHistorico
  };
}

function getExtractionErrorMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, '');
  if (!message) return fallback;

  if (
    message.includes('Limite de uso') ||
    message.includes('Payload excede') ||
    message.includes('Formato de') ||
    message.includes('Texto excede') ||
    message.includes('obrigatório')
  ) {
    return message;
  }

  return message.includes('503') ? 'IA ocupada. Tente novamente em instantes.' : fallback;
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';

  const supportedTypes = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
  ];

  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Falha ao ler áudio gravado.'));
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = result.split(',')[1];
      if (!base64Data) {
        reject(new Error('Áudio gravado sem conteúdo.'));
        return;
      }
      resolve(base64Data);
    };

    reader.readAsDataURL(blob);
  });
}
