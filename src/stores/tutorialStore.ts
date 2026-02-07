import { create } from 'zustand';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'templates-sidebar',
    targetSelector: '[data-tutorial="templates-sidebar"]',
    title: 'Templates de Exame',
    description: 'Aqui seleciona uma ou mais templates de exame. Cada template contém a estrutura e terminologia específica para o tipo de relatório que pretende gerar.',
    position: 'right',
  },
  {
    id: 'report-editor',
    targetSelector: '[data-tutorial="report-editor"]',
    title: 'Editor de Relatório',
    description: 'O relatório é gerado automaticamente após a gravação e pode ser editado manualmente. Use as ferramentas de formatação para ajustar o conteúdo final.',
    position: 'bottom',
  },
  {
    id: 'record-button',
    targetSelector: '[data-tutorial="record-button"]',
    title: 'Gravar Ditado',
    description: 'Inicie a gravação do seu ditado médico. O áudio é transcrito e processado pela IA para gerar o relatório. Este botão funciona de forma independente dos comandos por voz do sistema.',
    position: 'bottom',
  },
  {
    id: 'auto-texts',
    targetSelector: '[data-tutorial="auto-texts"]',
    title: 'Textos Automáticos',
    description: 'Painel de apoio com frases clínicas específicas da template selecionada. Servem como referência rápida para padronizar a linguagem durante o relato — não são clicáveis nem inserem texto automaticamente.',
    position: 'left',
  },
  {
    id: 'next-report',
    targetSelector: '[data-tutorial="next-report"]',
    title: 'Próximo Relatório',
    description: 'Guarda o relatório atual (incluindo o áudio gravado) e prepara o sistema para um novo exame. Permite manter um fluxo contínuo de trabalho sem navegação manual.',
    position: 'bottom',
  },
  {
    id: 'style-preferences',
    targetSelector: '[data-tutorial="style-preferences"]',
    title: 'Vamos melhorar juntos!',
    description: 'Defina as suas preferências pessoais de estilo de relatório (ex.: mais formal, conclusões por extenso ou em bullets). A IA adapta-se ao seu gosto pessoal ao longo do tempo.',
    position: 'bottom',
  },
  {
    id: 'voice-commands',
    targetSelector: '[data-tutorial="voice-commands"]',
    title: 'Comandos por Voz — Ouvir',
    description: 'Ative ou desative a interação por voz com o sistema. Permite usar comandos como: "iniciar gravação", "parar gravação", "guardar relatório", "próximo relatório", "limpar relatório", "reprocessar relatório" e "sair". Estes comandos executam ações da interface — não inserem texto clínico nem interferem com os Textos Automáticos. O botão "Gravar" funciona mesmo com "Ouvir" desligado.',
    position: 'bottom',
  },
];

interface TutorialState {
  isActive: boolean;
  currentStep: number;
  hasCompletedOnboarding: boolean;

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

  startTutorial: () => {
    set({ isActive: true, currentStep: 0 });
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < tutorialSteps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().closeTutorial();
      get().markOnboardingComplete();
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  closeTutorial: () => {
    set({ isActive: false, currentStep: 0 });
    get().markOnboardingComplete();
  },

  markOnboardingComplete: () => {
    set({ hasCompletedOnboarding: true });
    // Persist per user
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

    // Auto-start on first use
    if (!completed) {
      // Small delay to let the UI render first
      setTimeout(() => {
        set({ isActive: true, currentStep: 0 });
      }, 1000);
    }
  },
}));
