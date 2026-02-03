import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// n8n Webhook URL for medical transcription processing (TEST mode)
const N8N_WEBHOOK_URL = 'https://teamm8.app.n8n.cloud/webhook-test/medical-transcription';

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
      console.log('[n8n] Payload:', { 
        template_type: templateType, 
        template_text: templateText.substring(0, 100) + '...', 
        audio_file: audioUrl 
      });
      
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

      // TEST MODE: Just log the response, don't require specific format
      const responseText = await response.text();
      console.log('[n8n] Response status:', response.status);
      console.log('[n8n] Response body:', responseText);

      if (!response.ok) {
        // In test mode, still show success if we got a response (even error)
        // This helps debug the n8n workflow
        console.warn('[n8n] Non-OK response, but data was sent. Check n8n execution.');
        toast({
          title: "Dados enviados ao n8n",
          description: `Resposta: ${response.status}. Verifica a execução no n8n.`,
          variant: "default"
        });
        return null;
      }

      // Try to parse response
      try {
        const data: N8nResponse = JSON.parse(responseText);
        console.log('[n8n] Parsed response:', data);

        if (data.status === 'success' && data.final_report) {
          options.onSuccess?.(data.final_report);
          toast({
            title: "Relatório gerado",
            description: "O áudio foi processado e o relatório está pronto."
          });
          return data.final_report;
        }

        // If we got here, response format wasn't as expected but data was sent
        toast({
          title: "Dados enviados ao n8n",
          description: "Verifica a execução no n8n para ver os dados recebidos."
        });
        return null;
      } catch {
        // Response wasn't JSON - that's ok in test mode
        toast({
          title: "Dados enviados ao n8n",
          description: "Verifica a execução no n8n para ver os dados recebidos."
        });
        return null;
      }
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
