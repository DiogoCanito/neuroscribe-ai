import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// n8n Webhook URL for medical transcription processing (PRODUCTION)
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

      const responseText = await response.text();
      console.log('[n8n] Response status:', response.status);
      console.log('[n8n] Response body:', responseText);

      if (!response.ok) {
        throw new Error(`Erro n8n (${response.status}): ${responseText}`);
      }

      // Parse the response - n8n should return the final report text directly or as JSON
      let finalReport: string | null = null;
      
      try {
        // Try to parse as JSON first
        const data = JSON.parse(responseText);
        console.log('[n8n] Parsed JSON response:', data);
        
        // Support multiple response formats from n8n
        // Note: "final report" has a space in n8n response
        if (typeof data === 'string') {
          finalReport = data;
        } else if (data['final report']) {
          finalReport = data['final report'];
        } else if (data.final_report) {
          finalReport = data.final_report;
        } else if (data.finalReport) {
          finalReport = data.finalReport;
        } else if (data.report) {
          finalReport = data.report;
        } else if (data.text) {
          finalReport = data.text;
        } else if (data.output) {
          finalReport = data.output;
        }
      } catch {
        // Not JSON - treat the raw response as the report text
        console.log('[n8n] Response is plain text');
        finalReport = responseText.trim();
      }

      if (finalReport) {
        console.log('[n8n] Final report received:', finalReport.substring(0, 100) + '...');
        options.onSuccess?.(finalReport);
        toast({
          title: "Relatório gerado",
          description: "O áudio foi processado e o relatório está pronto para edição."
        });
        return finalReport;
      }

      throw new Error('Resposta do n8n não contém relatório');
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
