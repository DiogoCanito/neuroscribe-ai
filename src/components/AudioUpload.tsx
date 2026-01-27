import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileAudio, Loader2, X } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

interface AudioUploadProps {
  onTranscriptionComplete: (transcription: string) => void;
}

export function AudioUpload({ onTranscriptionComplete }: AudioUploadProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedTemplate, applyRulesToText } = useEditorStore();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a)$/i)) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Por favor, selecione um ficheiro de áudio válido (MP3, WAV, WebM, OGG, M4A)"
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
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('model_id', 'scribe_v2');
      formData.append('language_code', 'por');
      formData.append('tag_audio_events', 'false');
      formData.append('diarize', 'false');

      // Call ElevenLabs batch transcription API via edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData
      });

      if (error) throw error;

      if (data?.text) {
        // Apply replacement rules to transcribed text before adding to report
        const processedText = applyRulesToText(data.text);
        onTranscriptionComplete(processedText);
        toast({
          title: "Transcrição completa",
          description: "O áudio foi transcrito e as regras de substituição foram aplicadas"
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
      toast({
        variant: "destructive",
        title: "Erro de transcrição",
        description: "Não foi possível transcrever o áudio. Tente novamente."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, onTranscriptionComplete, toast]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload de Áudio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={isProcessing || !selectedTemplate}
            className="flex-1"
          />
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-primary" />
              <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
              disabled={isProcessing}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing || !selectedTemplate}
          className="w-full gap-2"
          size="sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              A transcrever...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Transcrever Áudio
            </>
          )}
        </Button>

        {!selectedTemplate && (
          <p className="text-xs text-muted-foreground text-center">
            Selecione um template para ativar o upload
          </p>
        )}
      </CardContent>
    </Card>
  );
}
