import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { Mic, MicOff, Pause, Play, Square, Timer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingControlsProps {
  onTranscriptionUpdate: (text: string) => void;
}

export function RecordingControls({ onTranscriptionUpdate }: RecordingControlsProps) {
  const { selectedTemplate, setOriginalTranscription, applyKeywordReplacements, applyColonFormatting } = useEditorStore();
  
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
      onTranscriptionUpdate(text);
      setOriginalTranscription(fullTranscript + ' ' + text);
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = useCallback(async () => {
    await startRecording();
    await connect();
  }, [startRecording, connect]);

  const handleStop = useCallback(() => {
    stopRecording();
    disconnect();
    // Apply text processing
    applyKeywordReplacements();
    applyColonFormatting();
  }, [stopRecording, disconnect, applyKeywordReplacements, applyColonFormatting]);

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
          {isRecording && (
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
          
          {isConnected && !isRecording && (
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
        {!isRecording ? (
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

        {audioUrl && !isRecording && (
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
