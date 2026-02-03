import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// n8n Webhook URL for medical transcription processing
const N8N_WEBHOOK_URL = 'https://teamm8.app.n8n.cloud/webhook/medical-transcription';

interface N8nProcessorOptions {
  onSuccess?: (finalReport: string) => void;
  onError?: (error: string) => void;
}

interface N8nResponse {
  status: 'success' | 'error';
  final_report?: string;
  transcription?: string;
  message?: string;
  metadata?: {
    template_type: string;
    language: string;
    processing_date: string;
  };
}

interface ProcessAudioParams {
  audioBlob: Blob;
  templateType: string;
  templateText: string;
}

export function useN8nProcessor(options: N8nProcessorOptions = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Uploads audio to Supabase storage and returns a signed URL
   */
  const uploadAudioToStorage = useCallback(async (audioBlob: Blob): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    const fileName = `temp/${user.id}/${Date.now()}.webm`;
    
    const { error: uploadError } = await supabase.storage
      .from('medical-files')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload do áudio: ${uploadError.message}`);
    }

    // Get a signed URL valid for 1 hour
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('medical-files')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error('Erro ao gerar URL do áudio');
    }

    return signedUrlData.signedUrl;
  }, []);

  /**
   * Sends audio and template data to n8n for processing
   * n8n handles: transcription + AI report generation
   * Returns: final formatted report
   */
  const processWithN8n = useCallback(async ({
    audioBlob,
    templateType,
    templateText,
  }: ProcessAudioParams): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Upload audio to get accessible URL
      console.log('[n8n] Uploading audio to storage...');
      const audioUrl = await uploadAudioToStorage(audioBlob);
      console.log('[n8n] Audio uploaded, URL obtained');

      // Step 2: Send to n8n webhook
      console.log('[n8n] Sending to n8n webhook...');
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_type: templateType,
          template_text: templateText,
          audio_file: audioUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n error (${response.status}): ${errorText}`);
      }

      const data: N8nResponse = await response.json();
      console.log('[n8n] Response received:', data);

      if (data.status === 'error') {
        throw new Error(data.message || 'Erro no processamento n8n');
      }

      if (data.status === 'success' && data.final_report) {
        options.onSuccess?.(data.final_report);
        toast({
          title: "Relatório gerado",
          description: "O áudio foi processado e o relatório está pronto."
        });
        return data.final_report;
      }

      throw new Error('Resposta inválida do n8n');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[n8n] Processing error:', errorMessage);
      setError(errorMessage);
      options.onError?.(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Erro ao processar",
        description: errorMessage
      });
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [uploadAudioToStorage, options, toast]);

  return {
    processWithN8n,
    isProcessing,
    error,
  };
}
