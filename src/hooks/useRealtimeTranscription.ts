import { useState, useCallback, useEffect, useRef } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeTranscriptionOptions {
  onPartialTranscript?: (text: string) => void;
  onCommittedTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseRealtimeTranscriptionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  partialTranscript: string;
  committedTranscripts: string[];
  fullTranscript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions = {}
): UseRealtimeTranscriptionReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  
  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      console.log('Partial transcript:', data.text);
      optionsRef.current.onPartialTranscript?.(data.text);
    },
    onCommittedTranscript: (data) => {
      console.log('Committed transcript:', data.text);
      optionsRef.current.onCommittedTranscript?.(data.text);
    },
    onCommittedTranscriptWithTimestamps: (data) => {
      console.log('Committed with timestamps:', data.text);
    },
  });

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || 'Falha ao obter token de transcrição');
      }

      console.log('Connecting to ElevenLabs Scribe with token...');
      
      // Connect using the SDK
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('Connected to ElevenLabs Scribe');
      setIsConnecting(false);
    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao conectar';
      setError(errorMessage);
      optionsRef.current.onError?.(errorMessage);
      setIsConnecting(false);
    }
  }, [scribe]);

  const disconnect = useCallback(() => {
    scribe.disconnect();
  }, [scribe]);

  useEffect(() => {
    return () => {
      scribe.disconnect();
    };
  }, [scribe]);

  // Build full transcript from committed transcripts
  const fullTranscript = scribe.committedTranscripts.map(t => t.text).join(' ');

  return {
    isConnected: scribe.isConnected,
    isConnecting,
    partialTranscript: scribe.partialTranscript,
    committedTranscripts: scribe.committedTranscripts.map(t => t.text),
    fullTranscript,
    connect,
    disconnect,
    error
  };
}
