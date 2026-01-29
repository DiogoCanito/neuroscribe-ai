import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/stores/editorStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Pause, Play, Square, Loader2, Sparkles, TestTube } from 'lucide-react';
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
    applyRulesToText 
  } = useEditorStore();
  
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [testText, setTestText] = useState('');
  const [testPopoverOpen, setTestPopoverOpen] = useState(false);
  const accumulatedTranscriptRef = useRef<string>('');
  
  const audioRecorder = useAudioRecorder();
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = audioRecorder;

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
    // Try to connect realtime, but don't block on failure
    try {
      await connect();
    } catch (err) {
      console.warn('Realtime transcription failed to connect, will use batch fallback:', err);
    }
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
        description: "Não foi possível adaptar o relatório."
      });
    } finally {
      setIsProcessingAI(false);
    }
  }, [selectedTemplate, setReportContent, toast]);

  // Fallback: transcribe audio using batch API
  const transcribeAudioBatch = useCallback(async (blob: Blob): Promise<string | null> => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('language_code', 'por');
      formData.append('tag_audio_events', 'false');
      formData.append('diarize', 'false');

      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData,
      });

      if (error) throw error;

      return data?.text || null;
    } catch (err) {
      console.error('Batch transcription error:', err);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    // Stop recording first - this triggers audioBlob to be set
    stopRecording();
    disconnect();

    // Check if we have realtime transcription
    const realtimeText = [
      accumulatedTranscriptRef.current,
      partialTranscript ? applyRulesToText(partialTranscript) : '',
    ]
      .map((t) => t.trim())
      .filter(Boolean)
      .join(' ')
      .trim();

    if (realtimeText) {
      accumulatedTranscriptRef.current = realtimeText;
      setLiveTranscript(realtimeText);
      setOriginalTranscription(realtimeText);
      await processWithAI(realtimeText);
      return;
    }

    // Fallback: wait a bit for audioBlob to be ready, then use batch transcription
    toast({
      title: "A transcrever áudio...",
      description: "A transcrição em tempo real não funcionou, a usar fallback."
    });

    // Wait for audioBlob to be available (MediaRecorder.onstop is async)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the current audioBlob from the recorder
    const currentBlob = audioRecorder.audioBlob;
    
    if (!currentBlob) {
      toast({
        variant: 'destructive',
        title: 'Sem áudio',
        description: 'Não foi possível captar o áudio da gravação.',
      });
      return;
    }

    const batchText = await transcribeAudioBatch(currentBlob);
    
    if (!batchText || !batchText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Sem transcrição',
        description: 'Não foi captado texto suficiente para gerar o relatório.',
      });
      return;
    }

    const processedBatchText = applyRulesToText(batchText);
    accumulatedTranscriptRef.current = processedBatchText;
    setLiveTranscript(processedBatchText);
    setOriginalTranscription(processedBatchText);
    await processWithAI(processedBatchText);
  }, [stopRecording, disconnect, partialTranscript, applyRulesToText, setOriginalTranscription, processWithAI, toast, transcribeAudioBatch, audioRecorder]);

  const handleTestSubmit = useCallback(async () => {
    if (!testText.trim() || !selectedTemplate) return;
    setOriginalTranscription(testText);
    setTestPopoverOpen(false);
    await processWithAI(testText);
    toast({
      title: "Teste executado",
      description: "O texto foi processado como transcrição."
    });
  }, [testText, selectedTemplate, setOriginalTranscription, processWithAI, toast]);

  const isProcessing = isProcessingAI || isTranscribing;

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      {isTranscribing && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          A transcrever...
        </div>
      )}

      {isProcessingAI && !isTranscribing && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary">
          <Sparkles className="w-3 h-3 animate-pulse" />
          AI...
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
          {isTranscribing ? 'A transcrever...' : 'A processar...'}
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
