import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [committedTranscripts, setCommittedTranscripts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fullTranscript = committedTranscripts.join(' ');

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsConnected(false);
    setPartialTranscript('');
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      streamRef.current = stream;

      // Get token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || 'Failed to get transcription token');
      }

      // Connect to ElevenLabs Speech-to-Text Realtime WebSocket
      const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${data.token}&model_id=scribe_v2_realtime&language_code=pt`;
      console.log('Connecting to ElevenLabs Speech-to-Text...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to ElevenLabs Speech-to-Text');
        setIsConnected(true);
        setIsConnecting(false);

        // Start sending audio as PCM 16kHz
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
            ? 'audio/webm;codecs=opus' 
            : 'audio/webm'
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const arrayBuffer = await event.data.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            ws.send(JSON.stringify({
              message_type: 'input_audio_chunk',
              audio_base_64: base64,
              sample_rate: 16000
            }));
          }
        };

        mediaRecorder.start(250); // Send audio every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Scribe message:', message.message_type, message);
          
          if (message.message_type === 'partial_transcript') {
            const text = message.text || '';
            setPartialTranscript(text);
            options.onPartialTranscript?.(text);
          } else if (message.message_type === 'committed_transcript' || message.message_type === 'committed_transcript_with_timestamps') {
            const text = message.text || '';
            if (text.trim()) {
              setCommittedTranscripts(prev => [...prev, text]);
            }
            setPartialTranscript('');
            options.onCommittedTranscript?.(text);
          } else if (message.message_type === 'session_started') {
            console.log('Session started:', message.session_id);
          } else if (message.message_type === 'error') {
            console.error('Scribe error:', message);
            setError(message.error || 'Erro de transcrição');
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Erro de conexão com o serviço de transcrição');
        options.onError?.('Erro de conexão');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('Disconnected from ElevenLabs, code:', event.code, 'reason:', event.reason);
        setIsConnected(false);
        setIsConnecting(false);
      };

    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      options.onError?.(errorMessage);
      setIsConnecting(false);
      disconnect();
    }
  }, [disconnect, options]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    partialTranscript,
    committedTranscripts,
    fullTranscript,
    connect,
    disconnect,
    error
  };
}
