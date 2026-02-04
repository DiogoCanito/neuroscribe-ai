import { useState, useCallback, useRef, useEffect } from 'react';
import { templates } from '@/data/templates';
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

// System command actions
type SystemAction = 
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'PAUSE_RECORDING'
  | 'RESUME_RECORDING'
  | 'NEXT_REPORT'
  | 'CLEAR_REPORT'
  | 'REPROCESS_REPORT'
  | 'PLAY_AUDIO';

interface SystemCommand {
  phrases: string[];
  action: SystemAction;
  description: string;
}

// Predefined system commands - these control the APPLICATION
const SYSTEM_COMMANDS: SystemCommand[] = [
  {
    phrases: ['próximo relatório', 'proximo relatorio', 'próximo', 'seguinte relatório'],
    action: 'NEXT_REPORT',
    description: 'Guardar e preparar próximo relatório'
  },
  {
    phrases: ['iniciar gravação', 'iniciar gravacao', 'começar gravação', 'começar a gravar', 'gravar'],
    action: 'START_RECORDING',
    description: 'Iniciar gravação de áudio'
  },
  {
    phrases: ['parar gravação', 'parar gravacao', 'terminar gravação', 'parar de gravar', 'parar'],
    action: 'STOP_RECORDING',
    description: 'Parar gravação de áudio'
  },
  {
    phrases: ['pausar gravação', 'pausar gravacao', 'pausar'],
    action: 'PAUSE_RECORDING',
    description: 'Pausar gravação'
  },
  {
    phrases: ['continuar gravação', 'retomar gravação', 'continuar a gravar', 'continuar'],
    action: 'RESUME_RECORDING',
    description: 'Retomar gravação'
  },
  {
    phrases: ['limpar relatório', 'limpar relatorio', 'limpar editor', 'limpar tudo', 'limpar'],
    action: 'CLEAR_REPORT',
    description: 'Limpar editor'
  },
  {
    phrases: ['reprocessar relatório', 'reprocessar relatorio', 'reprocessar', 'processar novamente'],
    action: 'REPROCESS_REPORT',
    description: 'Reprocessar com IA'
  },
  {
    phrases: ['ouvir áudio', 'ouvir audio', 'reproduzir áudio', 'tocar áudio'],
    action: 'PLAY_AUDIO',
    description: 'Reproduzir áudio associado'
  },
];

// Normalize text for comparison (remove accents and special chars)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings (0-1)
function similarity(s1: string, s2: string): number {
  const a = normalizeText(s1);
  const b = normalizeText(s2);
  
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  
  const matchingWords = wordsA.filter(word => 
    wordsB.some(w => w.includes(word) || word.includes(w))
  );
  
  return matchingWords.length / Math.max(wordsA.length, wordsB.length);
}

// Event system for cross-component communication
type VoiceCommandListener = (action: SystemAction) => void;
const listeners: Set<VoiceCommandListener> = new Set();

export function subscribeToVoiceCommands(listener: VoiceCommandListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitVoiceCommand(action: SystemAction) {
  listeners.forEach(listener => listener(action));
}

export function useVoiceCommands(): UseVoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  
  const { 
    loadTemplate,
    setIsRecording,
    setIsPaused,
    resetEditor,
  } = useEditorStore();

  // Find template by name or voice alias
  const findTemplateByName = useCallback((name: string): TemplateContent | null => {
    const normalizedSearch = normalizeText(name);
    let bestMatch: TemplateContent | null = null;
    let bestScore = 0;
    
    for (const modality of templates) {
      for (const region of modality.regions) {
        for (const template of region.templates) {
          // First check voice alias (custom command) - highest priority
          if (template.voiceAlias) {
            const aliasScore = similarity(normalizedSearch, template.voiceAlias);
            if (aliasScore >= 0.8) {
              // Voice alias is a near-exact match, use it immediately
              return template;
            }
          }
          
          // Then check template name
          const templateName = normalizeText(template.name);
          const score = similarity(normalizedSearch, templateName);
          
          // Also check if search contains key parts of template name
          const searchWords = normalizedSearch.split(' ');
          const templateWords = templateName.split(' ');
          const keyMatches = templateWords.filter(tw => 
            searchWords.some(sw => sw.includes(tw) || tw.includes(sw))
          ).length;
          const keyScore = keyMatches / templateWords.length;
          
          // Also check voice alias partial match
          let aliasPartialScore = 0;
          if (template.voiceAlias) {
            aliasPartialScore = similarity(normalizedSearch, template.voiceAlias);
          }
          
          const finalScore = Math.max(score, keyScore, aliasPartialScore);
          
          if (finalScore > bestScore && finalScore >= 0.5) {
            bestScore = finalScore;
            bestMatch = template;
          }
        }
      }
    }
    
    return bestMatch;
  }, []);

  // Find matching system command
  const findSystemCommand = useCallback((transcript: string): SystemCommand | null => {
    const normalizedTranscript = normalizeText(transcript);
    let bestMatch: SystemCommand | null = null;
    let bestScore = 0;
    
    for (const command of SYSTEM_COMMANDS) {
      for (const phrase of command.phrases) {
        const score = similarity(normalizedTranscript, phrase);
        if (score > bestScore && score >= 0.7) {
          bestScore = score;
          bestMatch = command;
        }
      }
    }
    
    return bestMatch;
  }, []);

  // Execute system action
  const executeAction = useCallback((action: SystemAction, commandDescription: string) => {
    switch (action) {
      case 'START_RECORDING':
        setIsRecording(true);
        toast({
          title: "Comando: Iniciar Gravação",
          description: "A gravação foi iniciada."
        });
        break;
        
      case 'STOP_RECORDING':
        setIsRecording(false);
        toast({
          title: "Comando: Parar Gravação",
          description: "A gravação foi terminada."
        });
        break;
        
      case 'PAUSE_RECORDING':
        setIsPaused(true);
        toast({
          title: "Comando: Pausar",
          description: "A gravação foi pausada."
        });
        break;
        
      case 'RESUME_RECORDING':
        setIsPaused(false);
        toast({
          title: "Comando: Continuar",
          description: "A gravação foi retomada."
        });
        break;
        
      case 'CLEAR_REPORT':
        resetEditor();
        toast({
          title: "Comando: Limpar",
          description: "O editor foi limpo."
        });
        break;
        
      case 'NEXT_REPORT':
      case 'REPROCESS_REPORT':
      case 'PLAY_AUDIO':
        // These need to be handled by the parent component
        emitVoiceCommand(action);
        toast({
          title: `Comando: ${commandDescription}`,
          description: "A executar..."
        });
        break;
    }
  }, [setIsRecording, setIsPaused, resetEditor]);

  // Process voice transcript
  const processCommand = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim();
    
    // 1. First, try to match template selection commands
    // Match patterns like "template X", "usar template X", "carregar template X", etc.
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
          setLastCommand(text);
          loadTemplate(template);
          toast({
            title: "Template carregado",
            description: `"${template.name}" selecionado por voz.`
          });
          return;
        } else {
          setLastCommand(text);
          toast({
            variant: "destructive",
            title: "Template não encontrado",
            description: `Não encontrei template para "${templateName}".`
          });
          return;
        }
      }
    }
    
    // 2. Try direct template name matching (without prefix)
    // For cases like just saying "RM Cérvico-Dorsal" or using voice alias
    const directMatch = findTemplateByName(text);
    if (directMatch && similarity(text, directMatch.voiceAlias || directMatch.name) >= 0.7) {
      setLastCommand(text);
      loadTemplate(directMatch);
      toast({
        title: "Template carregado",
        description: `"${directMatch.name}" selecionado por voz.`
      });
      return;
    }
    
    // 3. Check for system commands
    const command = findSystemCommand(text);
    if (command) {
      setLastCommand(text);
      executeAction(command.action, command.description);
      return;
    }
    
    // If nothing matches, don't do anything
    // The "Ouvir" button is for system AND template commands only
  }, [findTemplateByName, findSystemCommand, executeAction, loadTemplate]);

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
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    
    try {
      recognition.start();
      setIsListening(true);
      
      toast({
        title: "A ouvir comandos",
        description: "Diga comandos de sistema ou nomes de templates."
      });
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [processCommand]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setLastCommand(null);
    
    toast({
      title: "Comandos desativados",
      description: "O sistema deixou de ouvir comandos."
    });
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
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
