import { create } from 'zustand';
import { TemplateContent, TemplateModality, TemplateRegion } from '@/types/templates';

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
  
  // Complex actions
  loadTemplate: (template: TemplateContent) => void;
  insertText: (text: string, position?: number) => void;
  applyAutoText: (keyword: string) => void;
  applyKeywordReplacements: () => void;
  applyColonFormatting: () => void;
  findAndReplace: (find: string, replace: string, all?: boolean) => void;
  resetEditor: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
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
}));
