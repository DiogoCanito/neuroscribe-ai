import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateContent, TemplateModality, TemplateRegion } from '@/types/templates';

export interface ReplacementRule {
  id: string;
  from: string;
  to: string;
  autoApply: boolean;
}

export interface VoiceCommand {
  id: string;
  keyword: string;
  text: string;
}

interface EditorState {
  // Template state
  selectedModality: TemplateModality | null;
  selectedRegion: TemplateRegion | null;
  selectedTemplate: TemplateContent | null;
  
  // Editor state
  reportContent: string;
  originalTranscription: string;
  
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  
  // Voice commands
  voiceCommandsEnabled: boolean;
  
  // UI state
  showFindReplace: boolean;
  findText: string;
  replaceText: string;
  highlightedText: string;
  
  // Global rules and terms (persisted)
  replacementRules: ReplacementRule[];
  customTerms: string[];
  voiceCommands: VoiceCommand[];
  
  // Actions
  setSelectedModality: (modality: TemplateModality | null) => void;
  setSelectedRegion: (region: TemplateRegion | null) => void;
  setSelectedTemplate: (template: TemplateContent | null) => void;
  setReportContent: (content: string) => void;
  setOriginalTranscription: (transcription: string) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setVoiceCommandsEnabled: (enabled: boolean) => void;
  setShowFindReplace: (show: boolean) => void;
  setFindText: (text: string) => void;
  setReplaceText: (text: string) => void;
  setHighlightedText: (text: string) => void;
  
  // Rules & Terms actions
  addReplacementRule: (rule: Omit<ReplacementRule, 'id'>) => void;
  updateReplacementRule: (id: string, updates: Partial<ReplacementRule>) => void;
  deleteReplacementRule: (id: string) => void;
  addCustomTerm: (term: string) => void;
  deleteCustomTerm: (index: number) => void;
  addVoiceCommand: (command: Omit<VoiceCommand, 'id'>) => void;
  deleteVoiceCommand: (id: string) => void;
  
  // Complex actions
  loadTemplate: (template: TemplateContent) => void;
  insertText: (text: string, position?: number) => void;
  applyAutoText: (keyword: string) => void;
  applyKeywordReplacements: () => void;
  applyColonFormatting: () => void;
  applyReplacementRules: () => number;
  applyRulesToText: (text: string) => string;
  findAndReplace: (find: string, replace: string, all?: boolean) => void;
  resetEditor: () => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedModality: null,
      selectedRegion: null,
      selectedTemplate: null,
      reportContent: '',
      originalTranscription: '',
      isRecording: false,
      isPaused: false,
      recordingDuration: 0,
      audioBlob: null,
      voiceCommandsEnabled: true,
      showFindReplace: false,
      findText: '',
      replaceText: '',
      highlightedText: '',
      
      // Default rules
      replacementRules: [
        { id: '1', from: 'pex', to: 'por exemplo', autoApply: true },
        { id: '2', from: 'dx', to: 'diagnóstico', autoApply: true },
        { id: '3', from: 'hx', to: 'história', autoApply: true },
        { id: '4', from: 'px', to: 'paciente', autoApply: true },
      ],
      
      // Default terms
      customTerms: [
        'Sem alterações significativas',
        'Estudo comparativo',
        'Aspetos pós-operatórios',
        'Em contexto clínico',
        'Achados de características normais',
      ],
      
      // Default voice commands
      voiceCommands: [
        { id: '1', keyword: 'conclusão normal', text: 'Exame sem alterações significativas. Achados de características normais.' },
        { id: '2', keyword: 'técnica padrão', text: 'Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2 e STIR.' },
        { id: '3', keyword: 'sem derrame', text: 'Sem evidência de derrame articular significativo.' },
        { id: '4', keyword: 'alinhamento normal', text: 'Mantido o alinhamento fisiológico.' },
      ],
      
      // Simple setters
      setSelectedModality: (modality) => set({ selectedModality: modality }),
      setSelectedRegion: (region) => set({ selectedRegion: region }),
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setReportContent: (content) => set({ reportContent: content }),
      setOriginalTranscription: (transcription) => set({ originalTranscription: transcription }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsPaused: (isPaused) => set({ isPaused }),
      setRecordingDuration: (duration) => set({ recordingDuration: duration }),
      setAudioBlob: (blob) => set({ audioBlob: blob }),
      setVoiceCommandsEnabled: (enabled) => set({ voiceCommandsEnabled: enabled }),
      setShowFindReplace: (show) => set({ showFindReplace: show }),
      setFindText: (text) => set({ findText: text }),
      setReplaceText: (text) => set({ replaceText: text }),
      setHighlightedText: (text) => set({ highlightedText: text }),
      
      // Rules & Terms actions
      addReplacementRule: (rule) => {
        set((state) => ({
          replacementRules: [...state.replacementRules, { ...rule, id: Date.now().toString() }]
        }));
      },
      
      updateReplacementRule: (id, updates) => {
        set((state) => ({
          replacementRules: state.replacementRules.map(r => 
            r.id === id ? { ...r, ...updates } : r
          )
        }));
      },
      
      deleteReplacementRule: (id) => {
        set((state) => ({
          replacementRules: state.replacementRules.filter(r => r.id !== id)
        }));
      },
      
      addCustomTerm: (term) => {
        set((state) => ({
          customTerms: [...state.customTerms, term]
        }));
      },
      
      deleteCustomTerm: (index) => {
        set((state) => ({
          customTerms: state.customTerms.filter((_, i) => i !== index)
        }));
      },
      
      addVoiceCommand: (command) => {
        set((state) => ({
          voiceCommands: [...state.voiceCommands, { ...command, id: Date.now().toString() }]
        }));
      },
      
      deleteVoiceCommand: (id) => {
        set((state) => ({
          voiceCommands: state.voiceCommands.filter(c => c.id !== id)
        }));
      },
      
      // Complex actions
      loadTemplate: (template) => {
        set({
          selectedTemplate: template,
          reportContent: template.baseText,
          originalTranscription: ''
        });
      },
      
      insertText: (text, position) => {
        const { reportContent } = get();
        if (position !== undefined) {
          const newContent = 
            reportContent.slice(0, position) + 
            text + 
            reportContent.slice(position);
          set({ reportContent: newContent });
        } else {
          set({ reportContent: reportContent + text });
        }
      },
      
      applyAutoText: (keyword) => {
        const { selectedTemplate, reportContent } = get();
        if (!selectedTemplate) return;
        
        const autoText = selectedTemplate.autoTexts.find(
          at => at.keyword.toLowerCase() === keyword.toLowerCase()
        );
        
        if (autoText) {
          set({ reportContent: reportContent + ' ' + autoText.text });
        }
      },
      
      applyKeywordReplacements: () => {
        const { selectedTemplate, reportContent } = get();
        if (!selectedTemplate) return;
        
        let newContent = reportContent;
        selectedTemplate.keywordReplacements.forEach(({ from, to }) => {
          const regex = new RegExp(`\\b${from}\\b`, 'gi');
          newContent = newContent.replace(regex, to);
        });
        
        set({ reportContent: newContent });
      },
      
      applyColonFormatting: () => {
        const { reportContent } = get();
        // Find text before "dois pontos" and make it bold
        const regex = /(\S+(?:\s+\S+){0,3})\s+dois pontos/gi;
        const newContent = reportContent.replace(regex, '**$1:**');
        set({ reportContent: newContent });
      },
      
      applyReplacementRules: () => {
        const { reportContent, replacementRules } = get();
        let newContent = reportContent;
        let count = 0;
        
        replacementRules.forEach(rule => {
          if (rule.autoApply) {
            const regex = new RegExp(`\\b${rule.from}\\b`, 'gi');
            const matches = newContent.match(regex);
            if (matches) {
              count += matches.length;
              newContent = newContent.replace(regex, rule.to);
            }
          }
        });
        
        if (count > 0) {
          set({ reportContent: newContent });
        }
        
        return count;
      },
      
      // Apply rules to any text (used for transcription)
      applyRulesToText: (text: string) => {
        const { replacementRules } = get();
        let processedText = text;
        
        // First, apply punctuation rules (spoken punctuation to symbols)
        const punctuationRules = [
          { from: /\s*vírgula\s*/gi, to: ', ' },
          { from: /\s*ponto\s*$/gi, to: '.' },
          { from: /\s*ponto\s+/gi, to: '. ' },
          { from: /\s*ponto de interrogação\s*/gi, to: '? ' },
          { from: /\s*ponto de exclamação\s*/gi, to: '! ' },
          { from: /\s*dois pontos\s*/gi, to: ': ' },
          { from: /\s*ponto e vírgula\s*/gi, to: '; ' },
          { from: /\s*abre parênteses\s*/gi, to: ' (' },
          { from: /\s*fecha parênteses\s*/gi, to: ') ' },
          { from: /\s*nova linha\s*/gi, to: '\n' },
          { from: /\s*novo parágrafo\s*/gi, to: '\n\n' },
        ];
        
        punctuationRules.forEach(rule => {
          processedText = processedText.replace(rule.from, rule.to);
        });
        
        // Capitalize first letter after periods
        processedText = processedText.replace(/\.\s+([a-záàâãéèêíïóôõöúç])/gi, (match, letter) => {
          return '. ' + letter.toUpperCase();
        });
        
        // Capitalize first letter of text
        if (processedText.length > 0) {
          processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1);
        }
        
        // Then apply user-defined replacement rules
        replacementRules.forEach(rule => {
          if (rule.autoApply) {
            const regex = new RegExp(`\\b${rule.from}\\b`, 'gi');
            processedText = processedText.replace(regex, rule.to);
          }
        });
        
        // Clean up extra spaces
        processedText = processedText.replace(/\s+/g, ' ').trim();
        processedText = processedText.replace(/\s+\./g, '.');
        processedText = processedText.replace(/\s+,/g, ',');
        
        return processedText;
      },
      
      findAndReplace: (find, replace, all = false) => {
        const { reportContent } = get();
        if (all) {
          const regex = new RegExp(find, 'gi');
          set({ reportContent: reportContent.replace(regex, replace) });
        } else {
          set({ reportContent: reportContent.replace(find, replace) });
        }
      },
      
      resetEditor: () => {
        set({
          selectedModality: null,
          selectedRegion: null,
          selectedTemplate: null,
          reportContent: '',
          originalTranscription: '',
          isRecording: false,
          isPaused: false,
          recordingDuration: 0,
          audioBlob: null,
          showFindReplace: false,
          findText: '',
          replaceText: ''
        });
      }
    }),
    {
      name: 'medreport-editor-storage',
      partialize: (state) => ({
        replacementRules: state.replacementRules,
        customTerms: state.customTerms,
        voiceCommands: state.voiceCommands,
        voiceCommandsEnabled: state.voiceCommandsEnabled,
      }),
    }
  )
);
