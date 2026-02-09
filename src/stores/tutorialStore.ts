import { create } from 'zustand';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Actions to run when entering this step */
  onEnter?: () => void;
  /** Actions to run when leaving this step */
  onLeave?: () => void;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tutorial="report-editor"]',
    title: 'Bem-vindo ao MedReport',
    description: 'Aqui é onde os relatórios clínicos são criados a partir de templates e ditado por voz, com apoio de inteligência artificial.',
    position: 'bottom',
  },
  {
    id: 'templates-sidebar',
    targetSelector: '[data-tutorial="templates-sidebar"]',
    title: 'Menu de Templates',
    description: 'Aqui encontra os templates de exames organizados por modalidade (RM, TAC, etc.). Pode selecionar um ou mais templates para construir o relatório.',
    position: 'right',
    onEnter: () => {
      // Force open templates sidebar
      const { useEditorStore } = require('@/stores/editorStore');
      useEditorStore.getState().setTemplateSidebarMinimized(false);
    },
  },
  {
    id: 'multi-templates',
    targetSelector: '[data-tutorial="templates-sidebar"]',
    title: 'Seleção de Múltiplos Templates',
    description: 'É possível selecionar mais do que um template no mesmo relatório, por exemplo RM Cervical + RM Lombar. Cada novo template será acrescentado ao relatório, sem apagar o conteúdo anterior.',
    position: 'right',
  },
  {
    id: 'record-upload',
    targetSelector: '[data-tutorial="record-button"]',
    title: 'Gravação e Upload de Áudio',
    description: 'Pode ditar o relatório utilizando o botão "Gravar" ou enviar um ficheiro de áudio através de "Upload". O botão "Ouvir" controla apenas os comandos de voz do sistema — não interfere com a gravação. O botão "Gravar" funciona de forma independente.',
    position: 'bottom',
    onEnter: () => {
      // Minimize templates to show recording area better
      const { useEditorStore } = require('@/stores/editorStore');
      useEditorStore.getState().setTemplateSidebarMinimized(true);
    },
  },
  {
    id: 'report-editor',
    targetSelector: '[data-tutorial="report-editor"]',
    title: 'Geração do Relatório por IA',
    description: 'Após o áudio ser processado, o relatório é automaticamente gerado e aparece aqui no editor, já estruturado e pronto para revisão.',
    position: 'bottom',
  },
  {
    id: 'auto-texts',
    targetSelector: '[data-tutorial="auto-texts"]',
    title: 'Textos Automáticos',
    description: 'Esta aba apresenta os textos automáticos associados ao template selecionado. Os textos automáticos ajudam a acelerar a redação e são específicos de cada template.',
    position: 'left',
    onEnter: () => {
      // Force show auto-texts panel (ensure isReportGenerated is false so it shows)
      const { useEditorStore } = require('@/stores/editorStore');
      useEditorStore.getState().setIsReportGenerated(false);
    },
  },
  {
    id: 'verification',
    targetSelector: '[data-tutorial="verification-panel"]',
    title: 'Verificação de Erros e Incoerências',
    description: 'Aqui pode verificar automaticamente incoerências clínicas no relatório, como lateralidade inconsistente ou contradições internas. Ao clicar em "Verificar", o relatório é analisado e eventuais problemas são listados.',
    position: 'left',
    onEnter: () => {
      // Force show verification panel
      const { useEditorStore } = require('@/stores/editorStore');
      useEditorStore.getState().setIsReportGenerated(true);
    },
    onLeave: () => {
      const { useEditorStore } = require('@/stores/editorStore');
      useEditorStore.getState().setIsReportGenerated(false);
    },
  },
  {
    id: 'style-preferences',
    targetSelector: '[data-tutorial="style-preferences"]',
    title: 'Vamos melhorar juntos!',
    description: 'Este botão permite definir preferências pessoais do médico, como estilo de escrita ou formato da conclusão. Estas preferências são guardadas permanentemente e aplicadas automaticamente aos relatórios futuros.',
    position: 'bottom',
  },
  {
    id: 'action-bar',
    targetSelector: '[data-tutorial="action-bar"]',
    title: 'Barra de Ações do Relatório',
    description: 'Aqui pode copiar o relatório, exportar em PDF, reprocessar o áudio ou limpar o conteúdo atual.',
    position: 'bottom',
  },
  {
    id: 'next-report',
    targetSelector: '[data-tutorial="next-report"]',
    title: 'Próximo Relatório',
    description: 'Guarda o relatório atual (incluindo o áudio gravado) e prepara o sistema para um novo exame. Permite manter um fluxo contínuo de trabalho sem navegação manual.',
    position: 'bottom',
  },
  {
    id: 'completed-reports',
    targetSelector: '[data-tutorial="completed-reports"]',
    title: 'Área de Relatórios',
    description: 'Nesta área pode consultar relatórios anteriores: ver o relatório completo, fazer download do PDF, ouvir o áudio original ou eliminar relatórios.',
    position: 'bottom',
  },
  {
    id: 'voice-commands',
    targetSelector: '[data-tutorial="voice-commands"]',
    title: 'Comandos de Voz — Ouvir',
    description: 'Quando ativo, este botão permite controlar o sistema por voz, usando comandos como "guardar relatório" ou "próximo relatório". Os comandos de voz executam ações, não inserem texto clínico.',
    position: 'bottom',
  },
];

interface TutorialState {
  isActive: boolean;
  currentStep: number;
  hasCompletedOnboarding: boolean;
  /** Track previous isReportGenerated to restore after tutorial */
  _prevIsReportGenerated: boolean | null;

  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  closeTutorial: () => void;
  markOnboardingComplete: () => void;
  initializeForUser: (userId: string | null) => void;
}

const getStorageKey = (userId: string) => `tutorial_completed_${userId}`;

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  hasCompletedOnboarding: false,
  _prevIsReportGenerated: null,

  startTutorial: () => {
    // Save current state before tutorial starts
    try {
      const { useEditorStore } = require('@/stores/editorStore');
      const prevGenerated = useEditorStore.getState().isReportGenerated;
      set({ _prevIsReportGenerated: prevGenerated });
    } catch {}

    set({ isActive: true, currentStep: 0 });
    // Execute onEnter for step 0
    const step = tutorialSteps[0];
    step?.onEnter?.();
  },

  nextStep: () => {
    const { currentStep } = get();
    const currentStepData = tutorialSteps[currentStep];
    currentStepData?.onLeave?.();

    if (currentStep < tutorialSteps.length - 1) {
      const nextIdx = currentStep + 1;
      set({ currentStep: nextIdx });
      const nextStepData = tutorialSteps[nextIdx];
      nextStepData?.onEnter?.();
    } else {
      get().closeTutorial();
      get().markOnboardingComplete();
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentStepData = tutorialSteps[currentStep];
    currentStepData?.onLeave?.();

    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      set({ currentStep: prevIdx });
      const prevStepData = tutorialSteps[prevIdx];
      prevStepData?.onEnter?.();
    }
  },

  closeTutorial: () => {
    const { currentStep, _prevIsReportGenerated } = get();
    const currentStepData = tutorialSteps[currentStep];
    currentStepData?.onLeave?.();

    // Restore previous isReportGenerated state
    if (_prevIsReportGenerated !== null) {
      try {
        const { useEditorStore } = require('@/stores/editorStore');
        useEditorStore.getState().setIsReportGenerated(_prevIsReportGenerated);
      } catch {}
    }

    set({ isActive: false, currentStep: 0, _prevIsReportGenerated: null });
    get().markOnboardingComplete();
  },

  markOnboardingComplete: () => {
    set({ hasCompletedOnboarding: true });
    const userId = localStorage.getItem('tutorial_current_user');
    if (userId) {
      localStorage.setItem(getStorageKey(userId), 'true');
    }
  },

  initializeForUser: (userId: string | null) => {
    if (!userId) {
      set({ hasCompletedOnboarding: false, isActive: false });
      return;
    }
    localStorage.setItem('tutorial_current_user', userId);
    const completed = localStorage.getItem(getStorageKey(userId)) === 'true';
    set({ hasCompletedOnboarding: completed });

    if (!completed) {
      setTimeout(() => {
        set({ isActive: true, currentStep: 0 });
        const step = tutorialSteps[0];
        step?.onEnter?.();
      }, 1000);
    }
  },
}));
