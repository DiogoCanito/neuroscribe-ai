import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, X, FileAudio, Send } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useN8nProcessor } from '@/hooks/useN8nProcessor';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedTemplate, setOriginalTranscription, setReportContent } = useEditorStore();

  // n8n processor - handles all audio processing externally
  const { processWithN8n, isProcessing } = useN8nProcessor({
    onSuccess: (finalReport) => {
      setReportContent(finalReport);
      // Clear file after successful processing
      setSelectedFile(null);
      setOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => {
      console.error('n8n upload processing failed:', error);
    }
  });

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
    if (!selectedFile || !selectedTemplate) return;

    toast({
      title: "A processar...",
      description: "O ficheiro está a ser enviado para processamento."
    });

    // Convert File to Blob for n8n processing
    const audioBlob = new Blob([await selectedFile.arrayBuffer()], { type: selectedFile.type });

    // Send to n8n for processing (transcription + AI report generation)
    const result = await processWithN8n({
      audioBlob,
      templateType: selectedTemplate.name,
      templateText: selectedTemplate.baseText,
    });

    if (result) {
      // Store a placeholder for original transcription (n8n does the transcription)
      setOriginalTranscription('[Transcrição processada pelo n8n]');
      onTranscriptionComplete('[Processado]');
    }
  }, [selectedFile, selectedTemplate, processWithN8n, setOriginalTranscription, onTranscriptionComplete, toast]);

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
                A enviar para n8n...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Processar
              </>
            )}
          </Button>
          
          <p className="text-[10px] text-muted-foreground text-center">
            O áudio será processado externamente
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
