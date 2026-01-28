import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, X, FileAudio } from 'lucide-react';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedTemplate, applyRulesToText } = useEditorStore();

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
        onTranscriptionComplete(processedText);
        toast({
          title: "Transcrição completa",
          description: "Áudio transcrito com sucesso"
        });
        setSelectedFile(null);
        setOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
  }, [selectedFile, onTranscriptionComplete, toast, applyRulesToText]);

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
            disabled={!selectedFile || isProcessing}
            className="w-full gap-1.5 h-7 text-xs"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                A transcrever...
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
