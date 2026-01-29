import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, X, FileAudio, Sparkles } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';

interface CompactAudioUploadProps {
  onTranscriptionComplete: (transcription: string) => void;
}

export function CompactAudioUpload({ onTranscriptionComplete }: CompactAudioUploadProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedTemplate, applyRulesToText, setOriginalTranscription, setReportContent } = useEditorStore();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a)$/i)) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Selecione um ficheiro de áudio válido"
        });
        return;
      }
      setSelectedFile(file);
    }
  }, [toast]);

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
          title: "Relatório gerado",
          description: "O áudio foi transcrito e estruturado de acordo com o template."
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

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('model_id', 'scribe_v2');
      formData.append('language_code', 'por');
      formData.append('tag_audio_events', 'false');
      formData.append('diarize', 'false');

      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData
      });

      if (error) throw error;

      if (data?.text) {
        const processedText = applyRulesToText(data.text);
        setOriginalTranscription(processedText);
        onTranscriptionComplete(processedText);
        
        // Close popover and clear file before AI processing
        setSelectedFile(null);
        setOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Process with AI to generate structured report
        await processWithAI(processedText);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      toast({
        variant: "destructive",
        title: "Erro de transcrição",
        description: "Não foi possível transcrever o áudio"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, onTranscriptionComplete, toast, applyRulesToText, setOriginalTranscription, processWithAI]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1.5 h-7 text-xs"
          disabled={!selectedTemplate}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium">Upload de Áudio</p>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="h-8 text-xs"
          />

          {selectedFile && (
            <div className="flex items-center justify-between p-1.5 bg-muted rounded text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <FileAudio className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{selectedFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleClear}
                disabled={isProcessing}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing || isProcessingAI}
            className="w-full gap-1.5 h-7 text-xs"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                A transcrever...
              </>
            ) : isProcessingAI ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                A gerar relatório...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Transcrever
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
