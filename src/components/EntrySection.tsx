import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Mic, MicOff, Box, Loader2, Tag, MapPin, 
  RefreshCw, PlusCircle, History, Trash2, Plus, Edit3, TrendingUp, Receipt, Package, Camera
} from 'lucide-react';
import type { ExtractedItem, SnapshotContext } from '../services/geminiService';
import type { HistoryItem } from '../types/domain';

interface EntrySectionProps {
  input: string;
  setInput: (val: string) => void;
  isRecording: boolean;
  recordingSeconds: number;
  isAudioCaptureSupported: boolean;
  toggleRecording: () => void;
  isExtracting: boolean;
  isSistemaLiberado: boolean;
  error: string | null;
  handleExtract: () => void;
  currentResult: ExtractedItem | null;
  setCurrentResult: (val: ExtractedItem | null) => void;
  isPendingConfirmation: boolean;
  isSaving: boolean;
  confirmAndSave: (data: ExtractedItem) => void;
  cancelConfirmation: () => void;
  mergeStatus: { action: 'MERGE' | 'ADD', message: string } | null;
  history: HistoryItem[];
  handleClearHistory: () => void;
  isImporting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImportReceipt: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerImport: () => void;
  isSnapshotImporting: boolean;
  snapshotFileInputRef: React.RefObject<HTMLInputElement>;
  handleImportSnapshot: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerSnapshotImport: () => void;
  snapshotContext: SnapshotContext;
  setSnapshotContext: (context: SnapshotContext) => void;
  snapshotLocationSuggestions: SnapshotLocationSuggestions;
  pendingTriageCount: number;
  openTriageModal: () => void;
}

export interface SnapshotLocationSuggestions {
  rooms: string[];
  cabinets: string[];
  boxes: string[];
}

export function EntrySection({
  input,
  setInput,
  isRecording,
  recordingSeconds,
  isAudioCaptureSupported,
  toggleRecording,
  isExtracting,
  isSistemaLiberado,
  error,
  handleExtract,
  currentResult,
  setCurrentResult,
  isPendingConfirmation,
  isSaving,
  confirmAndSave,
  cancelConfirmation,
  mergeStatus,
  history,
  handleClearHistory,
  isImporting,
  fileInputRef,
  handleImportReceipt,
  triggerImport,
  isSnapshotImporting,
  snapshotFileInputRef,
  handleImportSnapshot,
  triggerSnapshotImport,
  snapshotContext,
  setSnapshotContext,
  snapshotLocationSuggestions,
  pendingTriageCount,
  openTriageModal
}: EntrySectionProps) {
  const isAnyImageImporting = isImporting || isSnapshotImporting;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      <div className="lg:col-span-5 space-y-6">
        <Card className="border-none shadow-lg rounded-[32px] bg-white overflow-hidden dark:border dark:border-border dark:bg-card">
          <div className="h-1.5 bg-primary w-full opacity-50" />
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-foreground">Nova Entrada</CardTitle>
            <CardDescription className="text-slate-500 dark:text-muted-foreground">Registre itens usando sua voz ou texto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  id="snapshot-comodo"
                  name="ordo-domus-snapshot-comodo"
                  list="snapshot-comodo-suggestions"
                  placeholder="Cômodo da foto"
                  value={snapshotContext.comodo || ''}
                  onChange={(event) => setSnapshotContext({ ...snapshotContext, comodo: event.target.value })}
                  disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || isSnapshotImporting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-10 rounded-xl bg-slate-50 text-sm font-bold dark:border-border dark:bg-muted"
                />
                <Input
                  id="snapshot-armario"
                  name="ordo-domus-snapshot-armario"
                  list="snapshot-armario-suggestions"
                  placeholder="Armário/local"
                  value={snapshotContext.armario || ''}
                  onChange={(event) => setSnapshotContext({ ...snapshotContext, armario: event.target.value })}
                  disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || isSnapshotImporting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-10 rounded-xl bg-slate-50 text-sm font-bold dark:border-border dark:bg-muted"
                />
                <Input
                  id="snapshot-caixa"
                  name="ordo-domus-snapshot-caixa"
                  list="snapshot-caixa-suggestions"
                  placeholder="Prateleira/caixa"
                  value={snapshotContext.caixa || ''}
                  onChange={(event) => setSnapshotContext({ ...snapshotContext, caixa: event.target.value })}
                  disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || isSnapshotImporting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-10 rounded-xl bg-slate-50 text-sm font-bold dark:border-border dark:bg-muted"
                />
                <datalist id="snapshot-comodo-suggestions">
                  {snapshotLocationSuggestions.rooms.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
                <datalist id="snapshot-armario-suggestions">
                  {snapshotLocationSuggestions.cabinets.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
                <datalist id="snapshot-caixa-suggestions">
                  {snapshotLocationSuggestions.boxes.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImportReceipt} 
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={snapshotFileInputRef}
                  onChange={handleImportSnapshot}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerImport}
                  disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || isAnyImageImporting}
                  className="w-full gap-2 rounded-xl transition-all h-10 px-3 text-slate-700 hover:bg-slate-50 dark:border-border dark:text-foreground dark:hover:bg-accent"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Receipt className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{isImporting ? "Importando..." : "Importar Cupom"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerSnapshotImport}
                  disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || isAnyImageImporting}
                  className="w-full gap-2 rounded-xl transition-all h-10 px-3 text-slate-700 hover:bg-slate-50 dark:border-border dark:text-foreground dark:hover:bg-accent"
                >
                  {isSnapshotImporting ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Camera className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{isSnapshotImporting ? "Lendo foto..." : "Inventário por Foto"}</span>
                </Button>
                {pendingTriageCount > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={openTriageModal}
                    className="w-full gap-2 rounded-xl transition-all h-10 px-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="truncate">Triagem Pendente</span>
                    <Badge variant="secondary" className="ml-auto bg-white/20 hover:bg-white/30 text-white border-none px-1.5 min-w-[20px] text-xs">
                      {pendingTriageCount}
                    </Badge>
                  </Button>
                )}
                <Button 
                  variant={isRecording ? "destructive" : "secondary"}
                  size="sm"
                  onClick={toggleRecording}
                  disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || !isAudioCaptureSupported}
                  className={`w-full gap-2 rounded-xl transition-all h-10 px-3 ${isRecording ? "animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-muted dark:text-foreground dark:hover:bg-accent"}`}
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  <span className="truncate">
                    {isExtracting
                      ? "Processando..."
                      : isRecording
                        ? `Parar ${formatRecordingTime(recordingSeconds)}`
                        : isAudioCaptureSupported
                          ? "Falar"
                          : "Sem áudio"}
                  </span>
                </Button>
              </div>
              {isRecording && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-center text-xs font-black uppercase tracking-widest text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  Gravando {formatRecordingTime(recordingSeconds)} / 01:00
                </div>
              )}
              <Textarea
                placeholder="Ex: Guardei 2 pacotes de café no armário superior da cozinha..."
                className="min-h-[140px] resize-none rounded-[20px] bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 text-base p-5 dark:border-border dark:bg-muted/50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isExtracting || isPendingConfirmation || !isSistemaLiberado || isSnapshotImporting}
              />
            </div>
            {error && <p className="text-sm text-destructive font-medium bg-destructive/5 p-3 rounded-xl border border-destructive/10">{error}</p>}
            <Button className="w-full rounded-[20px] h-14 text-lg font-bold shadow-lg shadow-primary/20" onClick={handleExtract} disabled={isExtracting || isPendingConfirmation || !input.trim() || !isSistemaLiberado || isAnyImageImporting}>
              {isExtracting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</> : <><Box className="mr-2 h-5 w-5" /> Extrair Dados</>}
            </Button>
          </CardContent>
        </Card>

        {currentResult && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="border-none shadow-md rounded-[32px] overflow-hidden bg-white border border-primary/5 dark:border-border dark:bg-card">
              <div className="bg-primary/5 px-6 py-4 flex justify-between items-center border-b border-primary/5 dark:border-border dark:bg-muted/40">
                <h3 className="font-bold text-primary flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Item Identificado
                </h3>
                {isPendingConfirmation ? (
                  <Input 
                    className="h-7 text-xs px-2 py-0 m-0 w-32 text-center bg-primary/10 border-primary/20 text-primary font-bold rounded-full"
                    value={currentResult.categoria || ''} 
                    onChange={e => setCurrentResult({...currentResult, categoria: e.target.value})} 
                    placeholder="Geral"
                  />
                ) : (
                  <Badge className="rounded-full px-3 py-1 bg-primary/10 text-primary border-none">
                    {currentResult.categoria || 'Geral'}
                  </Badge>
                )}
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {currentResult.transcricao && (
                    <div className="col-span-2 p-3 bg-slate-50 rounded-xl mb-2 dark:bg-muted">
                      <p className="text-xs text-slate-500 italic dark:text-muted-foreground">"{currentResult.transcricao}"</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-muted-foreground">Produto</p>
                    {isPendingConfirmation ? (
                      <Input 
                        value={currentResult.item || ''} 
                        onChange={e => setCurrentResult({...currentResult, item: e.target.value})}
                        className="font-bold text-slate-900 text-lg h-9 px-2 dark:text-foreground"
                      />
                    ) : (
                      <p className="font-bold text-slate-900 text-lg px-2 py-1 dark:text-foreground">{currentResult.item}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-muted-foreground">Quantidade</p>
                    {isPendingConfirmation ? (
                      <Input 
                        type="number"
                        value={currentResult.quantidade || ''} 
                        onChange={e => setCurrentResult({...currentResult, quantidade: Number(e.target.value) || 0})}
                        className="font-bold text-slate-900 text-lg h-9 px-2 dark:text-foreground"
                      />
                    ) : (
                      <p className="font-bold text-slate-900 text-lg px-2 py-1 dark:text-foreground">{currentResult.quantidade}</p>
                    )}
                  </div>
                  <div className="col-span-2 p-4 bg-slate-50 rounded-2xl space-y-3 dark:bg-muted">
                    <div className="flex items-start sm:items-center gap-3 w-full">
                      <MapPin className="w-4 h-4 text-primary opacity-60 mt-2 sm:mt-0 shrink-0" />
                      <div className="flex-1 w-full">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 dark:text-muted-foreground">Localização</p>
                        {isPendingConfirmation ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 w-full">
                            <Input 
                              placeholder="Cômodo"
                              value={currentResult.comodo || ''} 
                              onChange={e => setCurrentResult({...currentResult, comodo: e.target.value})}
                              className="h-8 text-sm font-bold text-slate-700 bg-white dark:bg-card dark:text-foreground"
                            />
                            <Input 
                              placeholder="Armário"
                              value={currentResult.armario || ''} 
                              onChange={e => setCurrentResult({...currentResult, armario: e.target.value})}
                              className="h-8 text-sm font-bold text-slate-700 bg-white dark:bg-card dark:text-foreground"
                            />
                            <Input 
                              placeholder="Caixa"
                              value={currentResult.caixa || ''} 
                              onChange={e => setCurrentResult({...currentResult, caixa: e.target.value})}
                              className="h-8 text-sm font-bold text-slate-700 bg-white dark:bg-card dark:text-foreground"
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-700 dark:text-foreground">
                            {currentResult.comodo} {currentResult.armario && `• ${currentResult.armario}`} {currentResult.caixa && `• ${currentResult.caixa}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {mergeStatus && (
                  <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${mergeStatus.action === 'MERGE' ? 'bg-blue-50 text-blue-700 border border-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mergeStatus.action === 'MERGE' ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-emerald-100 dark:bg-emerald-900/60'}`}>
                      {mergeStatus.action === 'MERGE' ? <RefreshCw className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    </div>
                    {mergeStatus.message}
                  </div>
                )}
                {isPendingConfirmation && (
                  <div className="flex gap-3 pt-4 pb-4 w-full">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      onClick={cancelConfirmation}
                      disabled={isSaving}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Descartar
                    </Button>
                    <Button 
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      onClick={() => confirmAndSave(currentResult)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                      ) : (
                        <><PlusCircle className="w-4 h-4 mr-2" /> Confirmar</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <div className="lg:col-span-7">
        <Card className="border-none shadow-lg rounded-[32px] h-full flex flex-col bg-white overflow-hidden dark:border dark:border-border dark:bg-card">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2 dark:text-foreground">
                <History className="w-5 h-5 text-slate-400 dark:text-muted-foreground" /> Histórico Recente
              </CardTitle>
              <CardDescription>Últimas movimentações da unidade</CardDescription>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-slate-400 hover:text-destructive rounded-xl dark:text-muted-foreground">
                <Trash2 className="w-4 h-4 mr-2" /> Limpar Vista
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {history.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 p-6 text-center dark:text-muted-foreground">
                <Box className="w-16 h-16 mb-4 opacity-10" />
                <p className="font-medium">Nenhuma movimentação encontrada.</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] w-full">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 sticky top-0 backdrop-blur-md dark:bg-muted/70">
                      <TableRow className="border-slate-100 dark:border-border">
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest dark:text-muted-foreground">Item</TableHead>
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest dark:text-muted-foreground">Detalhes</TableHead>
                        <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center dark:text-muted-foreground">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors dark:border-border dark:hover:bg-muted/50">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 dark:text-foreground">{item.item}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest dark:text-muted-foreground">{item.categoria}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-muted-foreground">
                                <MapPin className="w-3 h-3 opacity-40" />
                                <span className="text-xs font-bold">{item.comodo}</span>
                              </div>
                              {item.data && (
                                <div className="flex items-center gap-1.5 text-slate-400 dark:text-muted-foreground">
                                  <History className="w-3 h-3 opacity-40" />
                                  <span className="text-[10px] font-medium">
                                    {new Date(item.data).toLocaleDateString('pt-BR')} {new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="secondary" 
                              className={`rounded-lg border-none font-black ${
                                item.tipo === 'consumo' ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300' : 
                                item.tipo === 'exclusao' ? 'bg-slate-50 text-slate-400 dark:bg-muted dark:text-muted-foreground' :
                                item.tipo === 'ajuste' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-300' :
                                'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                              title={
                                item.tipo === 'consumo' ? 'Saída/Consumo' : 
                                item.tipo === 'exclusao' ? 'Item Removido' :
                                item.tipo === 'ajuste' ? 'Edição de Dados' :
                                'Entrada de Estoque'
                              }
                            >
                              <span className="flex items-center gap-1">
                                {item.tipo === 'consumo' ? <TrendingUp className="w-3 h-3 rotate-180" /> : 
                                 item.tipo === 'exclusao' ? <Trash2 className="w-3 h-3" /> :
                                 item.tipo === 'ajuste' ? <Edit3 className="w-3 h-3" /> :
                                 <Plus className="w-3 h-3" />}
                                {item.tipo === 'consumo' ? '-' : (item.tipo === 'entrada' ? '+' : '')}{item.quantidade}
                              </span>
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function formatRecordingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}
