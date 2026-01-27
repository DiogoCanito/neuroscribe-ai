import { useState, useCallback, useRef, useEffect } from 'react';
import { templates, voiceCommands } from '@/data/templates';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateContent } from '@/types/templates';

// Speech Recognition types for browsers
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface UseVoiceCommandsReturn {
  isListening: boolean;
  lastCommand: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceCommands(): UseVoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  
  const { 
    loadTemplate, 
    applyAutoText, 
    setIsRecording,
    setIsPaused,
    voiceCommandsEnabled 
  } = useEditorStore();

  const findTemplateByName = useCallback((name: string): TemplateContent | null => {
    const normalizedName = name.toLowerCase().trim();
    
    for (const modality of templates) {
      for (const region of modality.regions) {
        for (const template of region.templates) {
          const templateName = template.name.toLowerCase();
          if (templateName.includes(normalizedName) || normalizedName.includes(templateName)) {
            return template;
          }
        }
      }
    }
    return null;
  }, []);

  const processCommand = useCallback((transcript: string) => {
    if (!voiceCommandsEnabled) return;
    
    const text = transcript.toLowerCase().trim();
    setLastCommand(text);

    // Template selection
    const templateMatch = text.match(voiceCommands.selectTemplate);
    if (templateMatch) {
      const templateName = templateMatch[1];
      const template = findTemplateByName(templateName);
      if (template) {
        loadTemplate(template);
        return;
      }
    }

    // Auto-text insertion
    const autoTextMatch = text.match(voiceCommands.insertAutoText);
    if (autoTextMatch) {
      const keyword = autoTextMatch[1];
      applyAutoText(keyword);
      return;
    }

    // Recording controls
    if (voiceCommands.startRecording.test(text)) {
      setIsRecording(true);
      return;
    }

    if (voiceCommands.pauseRecording.test(text)) {
      setIsPaused(true);
      return;
    }

    if (voiceCommands.continueRecording.test(text)) {
      setIsPaused(false);
      return;
    }

    if (voiceCommands.stopRecording.test(text)) {
      setIsRecording(false);
      return;
    }
  }, [voiceCommandsEnabled, findTemplateByName, loadTemplate, applyAutoText, setIsRecording, setIsPaused]);

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'pt-PT';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      processCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListening && recognitionRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, processCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    lastCommand,
    startListening,
    stopListening,
    toggleListening
  };
}
