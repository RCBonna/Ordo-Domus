import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { extractInventoryData, type ExtractedItem } from '../services/geminiService';
import { formatarTexto, formatarData } from '../lib/utils';

export function useExtraction(unidadeId: string | undefined) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractedItem | null>(null);
  const [mergeStatus, setMergeStatus] = useState<{ action: 'MERGE' | 'ADD', message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExtractedItem[]>([]);
  const recognitionRef = useRef<any>(null);

  const toggleRecording = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       setError("Seu navegador não suporta gravação de áudio.");
       return;
    }
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return; 
    }
    try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript;
            setInput(prev => prev ? prev + " " + transcript : transcript);
        };
        recognition.onerror = (event: any) => {
            console.error("[Mic]", event.error);
            setIsRecording(false);
            recognitionRef.current = null;
        };
        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };
        recognitionRef.current = recognition;
        recognition.start();
    } catch(e) {
        setIsRecording(false);
        recognitionRef.current = null;
    }
  };

  const handleExtract = async () => {
    if (!input.trim() || !unidadeId) return;
    setIsExtracting(true);
    setError(null);
    setCurrentResult(null);
    setMergeStatus(null);
    try {
      const dataRaw = await extractInventoryData(input);
      const data: ExtractedItem = {
        item: formatarTexto(dataRaw.item) || 'Item sem nome',
        categoria: formatarTexto(dataRaw.categoria) || '',
        comodo: formatarTexto(dataRaw.comodo) || 'Não informado',
        armario: formatarTexto(dataRaw.armario) || '',
        caixa: formatarTexto(dataRaw.caixa) || '',
        validade: formatarData(dataRaw.validade) || '',
        quantidade: Number(dataRaw.quantidade) || 1
      };
      setCurrentResult(data);

      const { data: resultado, error: erroUpsert } = await supabase.rpc('upsert_inventario', {
        p_unidade_id: unidadeId,
        p_nome: data.item,
        p_categoria: data.categoria,
        p_comodo: data.comodo,
        p_armario: data.armario,
        p_caixa: data.caixa,
        p_quantidade: data.quantidade,
        p_validade: data.validade
      });

      if (erroUpsert) throw new Error('Falha ao gravar no banco de dados.');
      
      const acaoFinal = resultado.acao as 'MERGE' | 'ADD';
      const mensagem = acaoFinal === 'MERGE'
        ? 'A quantidade foi somada a um item existente!'
        : 'Item gravado com sucesso no inventário!';
      
      const itemNaTela: ExtractedItem = {
        item: resultado.nome,
        categoria: resultado.categoria,
        comodo: resultado.comodo,
        armario: resultado.armario,
        caixa: resultado.caixa,
        validade: resultado.validade || '',
        quantidade: Number(data.quantidade), // Quantidade que foi adicionada agora
        tipo: 'entrada'
      };

      // Gravar no histórico do banco
      await supabase
        .from('movimentacoes_inventario')
        .insert({
          unidade_id: unidadeId,
          item_nome: itemNaTela.item,
          categoria: itemNaTela.categoria,
          comodo: itemNaTela.comodo,
          quantidade: itemNaTela.quantidade,
          tipo: 'entrada'
        });

      setHistory(prev => [itemNaTela, ...prev]);
      setMergeStatus({ action: acaoFinal, message: mensagem });
      setInput('');
    } catch (err: any) {
      console.error("[useExtraction] Erro:", err);
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
        data: m.criado_em
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
  };

  const addHistoryItem = (item: any) => {
    setHistory(prev => [item, ...prev]);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    input, setInput,
    isRecording, toggleRecording,
    isExtracting, handleExtract,
    currentResult, mergeStatus, error,
    history, setHistory, handleClearHistory,
    addHistoryItem,
    carregarHistorico
  };
}
