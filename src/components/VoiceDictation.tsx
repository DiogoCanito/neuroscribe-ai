import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Mic, 
  Square, 
  Pause, 
  Play, 
  Loader2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientInfo {
  name: string;
  dateOfBirth?: string;
  clinicalHistory?: string;
}

interface StructuredReport {
  consultation_reason: string;
  exam_findings: string;
  diagnosis: string;
  therapeutic_plan: string;
  observations: string;
}

interface VoiceDictationProps {
  patientInfo: PatientInfo;
  examType: string;
  onReportGenerated: (report: StructuredReport, transcription: string) => void;
  existingTranscription?: string;
}

export function VoiceDictation({ 
  patientInfo, 
  examType, 
  onReportGenerated,
  existingTranscription = ''
}: VoiceDictationProps) {
  const { toast } = useToast();
  const [transcription, setTranscription] = useState(existingTranscription);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const {
    isRecording,
    isPaused,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error: recordingError
  } = useVoiceRecording();

  // Web Speech API for real-time transcription
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const w = window as any;
    if ('webkitSpeechRecognition' in w || 'SpeechRecognition' in w) {
      const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionClass();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'pt-PT';
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscription(prev => prev + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast({
            variant: "destructive",
            title: "Erro de reconhecimento",
            description: "Erro no reconhecimento de voz. Tente novamente."
          });
        }
      };
      
      setRecognition(recognitionInstance);
    }
  }, [toast]);

  const handleStartRecording = async () => {
    await startRecording();
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Speech recognition start error:', e);
      }
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('Speech recognition stop error:', e);
      }
    }
  };

  const handlePauseRecording = () => {
    pauseRecording();
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('Speech recognition stop error:', e);
      }
    }
  };

  const handleResumeRecording = () => {
    resumeRecording();
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Speech recognition start error:', e);
      }
    }
  };

  const generateStructuredReport = async () => {
    if (!transcription.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não há transcrição para processar"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-report', {
        body: {
          transcription,
          patientInfo,
          examType
        }
      });

      if (error) throw error;
      
      onReportGenerated(data, transcription);
      toast({
        title: "Sucesso",
        description: "Relatório estruturado gerado com sucesso"
      });
    } catch (err) {
      console.error('Error generating report:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar relatório. Tente novamente."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="card-medical">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Ditado por Voz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recordingError && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{recordingError}</span>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              size="lg"
              className="gap-2 bg-gradient-medical hover:opacity-90"
            >
              <Mic className="w-5 h-5" />
              Começar a Falar
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={handleResumeRecording} size="lg" variant="outline" className="gap-2">
                  <Play className="w-5 h-5" />
                  Continuar
                </Button>
              ) : (
                <Button onClick={handlePauseRecording} size="lg" variant="outline" className="gap-2">
                  <Pause className="w-5 h-5" />
                  Pausar
                </Button>
              )}
              <Button onClick={handleStopRecording} size="lg" variant="destructive" className="gap-2">
                <Square className="w-5 h-5" />
                Parar
              </Button>
            </>
          )}
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            isPaused ? "bg-warning/10" : "bg-primary/10"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full",
              isPaused ? "bg-warning" : "bg-primary animate-recording-pulse"
            )} />
            <span className="text-sm font-medium">
              {isPaused ? "Gravação pausada" : "A gravar..."}
            </span>
          </div>
        )}

        {/* Transcription Area */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Transcrição</label>
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="O texto transcrito aparecerá aqui... Pode também escrever ou editar manualmente."
            rows={8}
            className="resize-none"
          />
        </div>

        {/* Generate Report Button */}
        <Button
          onClick={generateStructuredReport}
          disabled={!transcription.trim() || isGenerating}
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              A gerar relatório...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Gerar Relatório Estruturado
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
