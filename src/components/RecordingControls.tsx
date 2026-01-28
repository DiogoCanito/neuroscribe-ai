import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/stores/editorStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Pause, Play, Square, Timer, Loader2, Sparkles, TestTube, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface RecordingControlsProps {
  onTranscriptionUpdate: (text: string) => void;
}

export function RecordingControls({ onTranscriptionUpdate }: RecordingControlsProps) {
  const { toast } = useToast();
  const { 
    selectedTemplate, 
    setOriginalTranscription, 
    setReportContent,
    applyRulesToText 
  } = useEditorStore();
  
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [showTestInput, setShowTestInput] = useState(false);
  const [testText, setTestText] = useState('');
  const accumulatedTranscriptRef = useRef<string>('');
  
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    error: recorderError
  } = useAudioRecorder();

  const {
    isConnected,
    isConnecting,
    partialTranscript,
    fullTranscript,
    connect,
    disconnect,
    error: transcriptionError
  } = useRealtimeTranscription({
    onCommittedTranscript: (text) => {
      // Accumulate transcriptions for AI processing later
      const processedText = applyRulesToText(text);
      accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + processedText;
      setLiveTranscript(accumulatedTranscriptRef.current);
      // Show live transcription in report for feedback
      onTranscriptionUpdate(processedText);
      setOriginalTranscription(accumulatedTranscriptRef.current);
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = useCallback(async () => {
    accumulatedTranscriptRef.current = '';
    setLiveTranscript('');
    await startRecording();
    await connect();
  }, [startRecording, connect]);

  const processWithAI = useCallback(async (transcription: string) => {
    if (!selectedTemplate || !transcription.trim()) return;
    
    setIsProcessingAI(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-report', {
        body: {
          transcription: transcription.trim(),
          templateName: selectedTemplate.name,
          templateBaseText: selectedTemplate.baseText,
        }
      });

      if (error) throw error;

      // Replace report content with AI-adapted version
      if (data?.adaptedReport) {
        setReportContent(data.adaptedReport);
        toast({
          title: "Relatório adaptado",
          description: "O texto foi estruturado de acordo com o template."
        });
      }
    } catch (err) {
      console.error('AI processing error:', err);
      toast({
        variant: "destructive",
        title: "Erro ao processar",
        description: "Não foi possível adaptar o relatório. O texto original foi mantido."
      });
    } finally {
      setIsProcessingAI(false);
    }
  }, [selectedTemplate, setReportContent, toast]);

  const handleStop = useCallback(async () => {
    stopRecording();
    disconnect();
    
    // Process with AI after stopping
    const transcription = accumulatedTranscriptRef.current.trim();
    if (transcription) {
      await processWithAI(transcription);
    }
  }, [stopRecording, disconnect, processWithAI]);

  const handlePause = useCallback(() => {
    pauseRecording();
  }, [pauseRecording]);

  const handleResume = useCallback(() => {
    resumeRecording();
  }, [resumeRecording]);

  const handleExportAudio = useCallback(() => {
    if (audioUrl && audioBlob) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `gravacao-${new Date().toISOString().slice(0, 10)}.webm`;
      link.click();
    }
  }, [audioUrl, audioBlob]);

  const error = recorderError || transcriptionError;

  return (
    <div className="flex flex-col gap-4">
      {/* Recording status and timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isProcessingAI && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4 animate-pulse" />
              A adaptar com AI...
            </div>
          )}
          
          {isRecording && !isProcessingAI && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              isPaused ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isPaused ? "bg-warning" : "bg-destructive animate-pulse"
              )} />
              {isPaused ? "Pausado" : "A gravar"}
            </div>
          )}
          
          {isConnected && !isRecording && !isProcessingAI && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-success/10 text-success">
              <div className="w-2 h-2 rounded-full bg-success" />
              Conectado
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="w-4 h-4" />
              <span className="font-mono text-sm">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Voice wave animation */}
        {isRecording && !isPaused && (
          <div className="voice-wave">
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isRecording && !isProcessingAI ? (
          <Button
            onClick={handleStart}
            disabled={isConnecting || !selectedTemplate}
            size="lg"
            className="gap-2 bg-gradient-medical hover:opacity-90"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                A conectar...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Iniciar Gravação
              </>
            )}
          </Button>
        ) : isProcessingAI ? (
          <Button disabled size="lg" className="gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            A processar com AI...
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button onClick={handleResume} size="lg" variant="outline" className="gap-2">
                <Play className="w-5 h-5" />
                Continuar
              </Button>
            ) : (
              <Button onClick={handlePause} size="lg" variant="outline" className="gap-2">
                <Pause className="w-5 h-5" />
                Pausar
              </Button>
            )}
            
            <Button onClick={handleStop} size="lg" variant="destructive" className="gap-2">
              <Square className="w-5 h-5" />
              Parar
            </Button>
          </>
        )}

        {audioUrl && !isRecording && !isProcessingAI && (
          <Button onClick={handleExportAudio} variant="outline" className="gap-2">
            Exportar Áudio
          </Button>
        )}

        {/* Test mode toggle */}
        <Button 
          onClick={() => setShowTestInput(!showTestInput)} 
          variant="ghost" 
          size="sm"
          className="gap-1.5 ml-auto text-muted-foreground"
        >
          <TestTube className="w-4 h-4" />
          Modo Teste
          {showTestInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Test input for simulating transcription */}
      <Collapsible open={showTestInput} onOpenChange={setShowTestInput}>
        <CollapsibleContent>
          <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Cole ou escreva um texto para simular uma transcrição de áudio:
            </p>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Ex: Informação clínica estadiamento de neoplasia do pulmão. Exame sem alterações valorizáveis..."
              className="min-h-[80px] text-sm"
              disabled={!selectedTemplate}
            />
            <Button
              onClick={async () => {
                if (!testText.trim() || !selectedTemplate) return;
                setOriginalTranscription(testText);
                await processWithAI(testText);
                toast({
                  title: "Teste executado",
                  description: "O texto foi processado como se fosse uma transcrição."
                });
              }}
              disabled={!testText.trim() || !selectedTemplate || isProcessingAI}
              size="sm"
              className="gap-1.5"
            >
              {isProcessingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Live transcription display during recording */}
      {(isRecording || isConnected) && (
        <div className="mt-2 p-4 bg-card rounded-lg border border-border min-h-[100px] max-h-[200px] overflow-y-auto shadow-sm">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Transcrição em tempo real
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {liveTranscript}
            {partialTranscript && (
              <span className="text-primary/70 italic"> {partialTranscript}</span>
            )}
            {!liveTranscript && !partialTranscript && (
              <span className="text-muted-foreground italic">A aguardar fala...</span>
            )}
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <MicOff className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
