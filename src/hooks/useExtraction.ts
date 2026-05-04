import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryData, extractInventoryDataFromAudio, type ExtractedItem } from '../services/geminiService';
import { formatarTexto, formatarData } from '../lib/utils';

export function useExtraction(unidadeId: string | undefined) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractedItem | null>(null);
  const [mergeStatus, setMergeStatus] = useState<{ action: 'MERGE' | 'ADD', message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExtractedItem[]>([]);
  
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';
        
      console.log("[Mic] Iniciando gravação com MIME:", mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("[Mic] Chunk recebido:", event.data.size);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("[Mic] Gravação finalizada. Tamanho total:", audioBlob.size);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        
        if (audioBlob.size < 1000) {
          setError("O áudio gravado está vazio. Verifique seu microfone.");
          return;
        }

        // Processar o áudio automaticamente após parar
        await handleAudioExtraction(audioBlob, mimeType);
      };

      mediaRecorder.start(1000); // Enviar dados a cada 1 segundo
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("[Mic Error]", err);
      setError("Não foi possível acessar o microfone.");
      setIsRecording(false);
    }
  };

  const handleAudioExtraction = async (blob: Blob, mimeType: string) => {
    if (!unidadeId) return;
    setIsExtracting(true);
    setError(null);
    
    try {
      // Converter blob para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      const dataRaw = await extractInventoryDataFromAudio(base64Data, mimeType);
      await processExtractionResult(dataRaw);
    } catch (err: any) {
      console.error("[Audio Extraction Error]", err);
      setError("Erro ao processar áudio. Tente falar de forma mais clara ou usar texto.");
    } finally {
      setIsExtracting(false);
    }
  };

  const processExtractionResult = async (dataRaw: ExtractedItem) => {
    if (!unidadeId) return;

    const data: ExtractedItem = {
      item: formatarTexto(dataRaw.item) || 'Item sem nome',
      categoria: formatarTexto(dataRaw.categoria) || 'Geral',
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
      console.log("[Extraction] Iniciando gravação no Supabase (upsert_inventario)...", editedData);

      const dbPromise = (async () => {
        console.log("[Extraction] Iniciando chamada RPC upsert_inventario...");
        const { data: resultado, error: erroUpsert } = await supabase.rpc('upsert_inventario', {
          p_unidade_id: unidadeId,
          p_nome: editedData.item,
          p_categoria: editedData.categoria,
          p_comodo: editedData.comodo,
          p_armario: editedData.armario,
          p_caixa: editedData.caixa,
          p_quantidade: editedData.quantidade,
          p_validade: editedData.validade
        });
        console.log("[Extraction] Retorno da chamada RPC upsert_inventario:", resultado, erroUpsert);

        if (erroUpsert) throw erroUpsert;
        
        const acaoFinal = resultado?.acao as 'MERGE' | 'ADD' || 'ADD';
        const mensagem = acaoFinal === 'MERGE'
          ? 'A quantidade foi somada a um item existente!'
          : 'Item gravado com sucesso no inventário!';
        
        const itemNaTela: ExtractedItem = {
          item: resultado?.nome || editedData.item,
          categoria: resultado?.categoria || editedData.categoria,
          comodo: resultado?.comodo || editedData.comodo,
          armario: resultado?.armario || editedData.armario,
          caixa: resultado?.caixa || editedData.caixa,
          validade: resultado?.validade || editedData.validade || '',
          quantidade: Number(editedData.quantidade),
          tipo: 'entrada',
          transcricao: editedData.transcricao,
          data: new Date().toISOString()
        };

        // Gravar no histórico do banco
        console.log("[Extraction] Iniciando inserção em movimentacoes_inventario...");
        const { error: erroHist } = await supabase
          .from('movimentacoes_inventario')
          .insert({
            unidade_id: unidadeId,
            item_nome: itemNaTela.item,
            categoria: itemNaTela.categoria,
            comodo: itemNaTela.comodo,
            quantidade: itemNaTela.quantidade,
            tipo: 'entrada'
          });
        console.log("[Extraction] Retorno da inserção em movimentacoes_inventario:", erroHist);

        if (erroHist) console.warn("Erro ao gravar histórico:", erroHist);

        return { itemNaTela, acaoFinal, mensagem };
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: O banco de dados demorou muito para responder.')), 10000)
      );

      const dbResult: any = await Promise.race([dbPromise, timeoutPromise]);

      setHistory(prev => [dbResult.itemNaTela, ...prev]);
      setMergeStatus({ action: dbResult.acaoFinal, message: dbResult.mensagem });
      
      setCurrentResult(dbResult.itemNaTela);
      setIsPendingConfirmation(false);
      
      if (!editedData.transcricao) {
         setInput('');
      }
    } catch (err: any) {
      console.error("[Confirm And Save Error]", err);
      setError(`Erro ao salvar no BD: ${err.message || 'Desconhecido'}`);
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
    setIsExtracting(true);
    setError(null);
    setCurrentResult(null);
    setMergeStatus(null);
    setIsPendingConfirmation(false);
    try {
      const dataRaw = await extractInventoryData(input);
      await processExtractionResult(dataRaw);
      // Removed setInput('') from here because processExtractionResult now handles it.
    } catch (err: any) {
      console.error("[handleExtract] Erro:", err);
      setError(err.message && err.message.includes('503') ? 'IA ocupada. Tente novamente em instantes.' : 'Erro ao processar. Verifique a conexão.');
    } finally {
      setIsExtracting(false);
    }
  };

  const carregarHistorico = async () => {
    if (!unidadeId) return;
    const { data, error } = await supabase
      .from('movimentacoes_inventario')
      .select('*')
      .eq('unidade_id', unidadeId)
      .order('criado_em', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      const historyItems: ExtractedItem[] = data.map(m => ({
        item: m.item_nome,
        categoria: m.categoria,
        comodo: m.comodo,
        quantidade: m.quantidade,
        tipo: m.tipo as any,
        data: m.criado_em,
        armario: '',
        caixa: '',
        validade: ''
      }));
      setHistory(historyItems);
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

  const addHistoryItem = (item: any) => {
    setHistory(prev => [item, ...prev]);
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    input, setInput,
    isRecording, toggleRecording,
    isExtracting, handleExtract,
    currentResult, setCurrentResult,
    isPendingConfirmation, isSaving, confirmAndSave, cancelConfirmation,
    mergeStatus, error,
    history, setHistory, handleClearHistory,
    addHistoryItem,
    carregarHistorico
  };
}
