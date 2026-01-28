import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Pause, Play, Square, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const accumulatedTranscriptRef = useRef<string>('');
  
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useAudioRecorder();

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

  const handleStop = useCallback(async () => {
    stopRecording();
    disconnect();
    
    const transcription = accumulatedTranscriptRef.current.trim();
    if (transcription) {
      await processWithAI(transcription);
    }
  }, [stopRecording, disconnect, processWithAI]);

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      {isProcessingAI && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary">
          <Sparkles className="w-3 h-3 animate-pulse" />
          AI...
        </div>
      )}
      
      {isRecording && !isProcessingAI && (
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
      {!isRecording && !isProcessingAI ? (
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
      ) : isProcessingAI ? (
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
    </div>
  );
}
