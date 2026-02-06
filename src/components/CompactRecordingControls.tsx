import { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/stores/editorStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { useN8nProcessor } from '@/hooks/useN8nProcessor';
import { subscribeToVoiceCommands } from '@/hooks/useVoiceCommands';
import { Mic, Pause, Play, Square, Loader2, Sparkles, TestTube, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CompactRecordingControlsProps {
  onTranscriptionUpdate: (text: string) => void;
}

export function CompactRecordingControls({ onTranscriptionUpdate }: CompactRecordingControlsProps) {
  const { toast } = useToast();
  const { 
    selectedTemplate, 
    setOriginalTranscription, 
    setReportContent,
    applyRulesToText,
    reportStylePreferences,
  } = useEditorStore();
  
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [testText, setTestText] = useState('');
  const [testPopoverOpen, setTestPopoverOpen] = useState(false);
  const accumulatedTranscriptRef = useRef<string>('');
  
  const audioRecorder = useAudioRecorder();
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = audioRecorder;

  // n8n processor - handles all audio processing externally
  const { processWithN8n, isProcessing: isProcessingN8n } = useN8nProcessor({
    onSuccess: (finalReport) => {
      setReportContent(finalReport);
    },
    onError: (error) => {
      console.error('n8n processing failed:', error);
    }
  });

  const {
    isConnecting,
    partialTranscript,
    connect,
    disconnect,
  } = useRealtimeTranscription({
    onCommittedTranscript: (text) => {
      const processedText = applyRulesToText(text);
      accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + processedText;
      setLiveTranscript(accumulatedTranscriptRef.current);
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
    // Realtime transcription for live preview only (n8n will do final transcription)
    try {
      await connect();
    } catch (err) {
      console.warn('Realtime transcription failed to connect:', err);
    }
  }, [startRecording, connect]);

  const handleStop = useCallback(async () => {
    // Stop recording first - this triggers audioBlob to be set
    stopRecording();
    disconnect();

    // Wait for audioBlob to be available (MediaRecorder.onstop is async)
    await new Promise(resolve => setTimeout(resolve, 500));

    const currentBlob = audioRecorder.audioBlob;
    
    if (!currentBlob) {
      toast({
        variant: 'destructive',
        title: 'Sem áudio',
        description: 'Não foi possível captar o áudio da gravação.',
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Sem template',
        description: 'Selecione um template antes de gravar.',
      });
      return;
    }

    // Store live transcript as original transcription (for reference)
    const liveText = accumulatedTranscriptRef.current || 
      (partialTranscript ? applyRulesToText(partialTranscript) : '');
    if (liveText) {
      setOriginalTranscription(liveText);
    }

    // Send to n8n for processing (transcription + AI report generation)
    toast({
      title: "A processar...",
      description: "O áudio está a ser enviado para processamento."
    });

    await processWithN8n({
      audioBlob: currentBlob,
      templateType: selectedTemplate.name,
      templateText: selectedTemplate.baseText,
      reportStylePreferences,
    });
  }, [stopRecording, disconnect, partialTranscript, applyRulesToText, setOriginalTranscription, selectedTemplate, processWithN8n, audioRecorder, toast, reportStylePreferences]);

  // Subscribe to voice commands for recording control
  useEffect(() => {
    const unsubscribe = subscribeToVoiceCommands((action) => {
      switch (action) {
        case 'START_RECORDING':
          if (!isRecording && !isProcessingN8n && selectedTemplate) {
            handleStart();
          }
          break;
        case 'STOP_RECORDING':
          if (isRecording) {
            handleStop();
          }
          break;
        case 'PAUSE_RECORDING':
          if (isRecording && !isPaused) {
            pauseRecording();
          }
          break;
        case 'RESUME_RECORDING':
          if (isRecording && isPaused) {
            resumeRecording();
          }
          break;
      }
    });

    return unsubscribe;
  }, [isRecording, isPaused, isProcessingN8n, selectedTemplate, handleStart, handleStop, pauseRecording, resumeRecording]);

  const handleTestSubmit = useCallback(async () => {
    if (!testText.trim() || !selectedTemplate) return;
    
    setOriginalTranscription(testText);
    setTestPopoverOpen(false);
    
    // For test mode, create a simple text blob to send to n8n
    // Since we already have text, we'll need a different approach
    // For now, show a message that test mode requires audio
    toast({
      variant: "default",
      title: "Modo de teste",
      description: "O modo de teste ainda não está implementado para o fluxo n8n. Use gravação de áudio."
    });
  }, [testText, selectedTemplate, setOriginalTranscription, toast]);

  const isProcessing = isProcessingN8n;

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      {isProcessingN8n && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary">
          <Send className="w-3 h-3 animate-pulse" />
          n8n...
        </div>
      )}
      
      {isRecording && !isProcessing && (
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium",
          isPaused ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isPaused ? "bg-warning" : "bg-destructive animate-pulse"
          )} />
          {formatDuration(duration)}
        </div>
      )}

      {/* Control buttons */}
      {!isRecording && !isProcessing ? (
        <Button
          onClick={handleStart}
          disabled={isConnecting || !selectedTemplate}
          size="sm"
          className="gap-1.5 h-7 text-xs"
        >
          {isConnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
          Gravar
        </Button>
      ) : isProcessing ? (
        <Button disabled size="sm" className="gap-1.5 h-7 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          A processar...
        </Button>
      ) : (
        <>
          {isPaused ? (
            <Button onClick={resumeRecording} size="sm" variant="outline" className="gap-1 h-7 text-xs px-2">
              <Play className="w-3 h-3" />
            </Button>
          ) : (
            <Button onClick={pauseRecording} size="sm" variant="outline" className="gap-1 h-7 text-xs px-2">
              <Pause className="w-3 h-3" />
            </Button>
          )}
          <Button onClick={handleStop} size="sm" variant="destructive" className="gap-1 h-7 text-xs px-2">
            <Square className="w-3 h-3" />
            Parar
          </Button>
        </>
      )}

      {/* Test Mode Button */}
      <Popover open={testPopoverOpen} onOpenChange={setTestPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 text-xs px-2 text-muted-foreground"
            disabled={!selectedTemplate || isProcessing}
          >
            <TestTube className="w-3 h-3" />
            Teste
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Cole texto para simular uma transcrição:
            </p>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Ex: Informação clínica estadiamento de neoplasia do pulmão..."
              className="min-h-[100px] text-xs"
            />
            <Button
              onClick={handleTestSubmit}
              disabled={!testText.trim() || isProcessing}
              size="sm"
              className="w-full gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gerar Relatório
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
