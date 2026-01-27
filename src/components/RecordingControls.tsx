import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Pause, Play, Square, Timer, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RecordingControlsProps {
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
      accumulatedTranscriptRef.current += ' ' + processedText;
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
      </div>

      {/* Partial transcription preview */}
      {partialTranscript && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-sm text-muted-foreground italic">{partialTranscript}</p>
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
