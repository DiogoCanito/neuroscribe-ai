import { useState, useCallback, useRef, useEffect } from 'react';
import { templates, voiceCommands } from '@/data/templates';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateContent } from '@/types/templates';
import { toast } from '@/hooks/use-toast';

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

// Normalize text for comparison (remove accents and special chars)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[-_]/g, ' ') // Replace hyphens/underscores with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Calculate similarity between two strings (0-1)
function similarity(s1: string, s2: string): number {
  const a = normalizeText(s1);
  const b = normalizeText(s2);
  
  // Exact match
  if (a === b) return 1;
  
  // One contains the other
  if (a.includes(b) || b.includes(a)) return 0.9;
  
  // Word-based matching
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  
  const matchingWords = wordsA.filter(word => 
    wordsB.some(w => w.includes(word) || word.includes(w))
  );
  
  return matchingWords.length / Math.max(wordsA.length, wordsB.length);
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
    const normalizedSearch = normalizeText(name);
    let bestMatch: TemplateContent | null = null;
    let bestScore = 0;
    
    for (const modality of templates) {
      for (const region of modality.regions) {
        for (const template of region.templates) {
          const templateName = normalizeText(template.name);
          const score = similarity(normalizedSearch, templateName);
          
          // Also check if search contains key parts of template name
          const searchWords = normalizedSearch.split(' ');
          const templateWords = templateName.split(' ');
          const keyMatches = templateWords.filter(tw => 
            searchWords.some(sw => sw.includes(tw) || tw.includes(sw))
          ).length;
          const keyScore = keyMatches / templateWords.length;
          
          const finalScore = Math.max(score, keyScore);
          
          if (finalScore > bestScore && finalScore >= 0.5) {
            bestScore = finalScore;
            bestMatch = template;
          }
        }
      }
    }
    
    return bestMatch;
  }, []);

  const processCommand = useCallback((transcript: string) => {
    if (!voiceCommandsEnabled) return;
    
    const text = transcript.toLowerCase().trim();
    setLastCommand(text);

    // Template selection - more flexible patterns
    // Match "template X", "usar template X", "carregar template X", etc.
    const templatePatterns = [
      /^(?:template|usar template|carregar template|selecionar template|abrir template)\s+(.+)$/i,
      /^(?:rm|ressonância|ressonancia)\s+(.+)$/i,  // "RM Cervical", "Ressonância Joelho"
    ];
    
    for (const pattern of templatePatterns) {
      const match = text.match(pattern);
      if (match) {
        const templateName = match[1];
        const template = findTemplateByName(templateName);
        if (template) {
          loadTemplate(template);
          toast({
            title: "Template carregado",
            description: `"${template.name}" selecionado por voz.`
          });
          return;
        } else {
          toast({
            variant: "destructive",
            title: "Template não encontrado",
            description: `Não encontrei template para "${templateName}".`
          });
          return;
        }
      }
    }
    
    // Also try direct template name matching (without prefix)
    // For cases like just saying "RM Cérvico-Dorsal"
    const directMatch = findTemplateByName(text);
    if (directMatch && similarity(text, directMatch.name) >= 0.7) {
      loadTemplate(directMatch);
      toast({
        title: "Template carregado",
        description: `"${directMatch.name}" selecionado por voz.`
      });
      return;
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
      toast({
        variant: "destructive",
        title: "Não suportado",
        description: "O seu navegador não suporta reconhecimento de voz."
      });
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
    
    toast({
      title: "A ouvir comandos",
      description: "Diga 'Template [nome]' para selecionar."
    });
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
