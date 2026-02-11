import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateSidebar } from '@/components/TemplateSidebar';
import { CompactRecordingControls } from '@/components/CompactRecordingControls';
import { ReportEditor } from '@/components/ReportEditor';
import { VoiceCommandsToggle } from '@/components/VoiceCommandsToggle';
import { CompactAudioUpload } from '@/components/CompactAudioUpload';
import { CompletedReportsList } from '@/components/CompletedReportsList';
import { ProfileTab } from '@/components/ProfileTab';
import { ClinicalAutoText } from '@/components/ClinicalAutoText';
import { ReportVerification } from '@/components/ReportVerification';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { useEditorStore } from '@/stores/editorStore';
import { useN8nProcessor } from '@/hooks/useN8nProcessor';
import { subscribeToVoiceCommands } from '@/hooks/useVoiceCommands';
import { useTutorialStore } from '@/stores/tutorialStore';
import { TemplateContent } from '@/types/templates';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, RotateCcw, LogOut, Plus, FolderOpen, ArrowRight, Loader2, RefreshCw, PanelLeftClose, PanelLeft, Info, User } from 'lucide-react';
import { StylePreferencesDialog } from '@/components/StylePreferencesDialog';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';

export default function ReportEditorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new');
  const [isSaving, setIsSaving] = useState(false);
  
  const { 
    selectedTemplate, 
    loadTemplate, 
    reportContent,
    setReportContent, 
    resetEditor,
    audioBlob,
    recordingDuration,
    isRecording,
    isTemplateSidebarMinimized,
    setTemplateSidebarMinimized,
    reportStylePreferences,
    isReportGenerated,
    setIsReportGenerated,
    voiceCommandsEnabled,
  } = useEditorStore();

  const { startTutorial, initializeForUser: initTutorial } = useTutorialStore();

  // Initialize tutorial for user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      initTutorial(user?.id ?? null);
    });
  }, [initTutorial]);

  // n8n processor for reprocessing
  const { processWithN8n, isProcessing } = useN8nProcessor({
    onSuccess: (finalReport) => {
      setReportContent(finalReport);
      setIsReportGenerated(true);
    },
  });

  // Auto-minimize sidebar when recording starts
  useEffect(() => {
    if (isRecording) {
      setTemplateSidebarMinimized(true);
    }
  }, [isRecording, setTemplateSidebarMinimized]);


  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast({
      title: "Sessão terminada",
      description: "Até breve!"
    });
  }, [navigate, toast]);

  const handleTemplateSelect = useCallback((template: TemplateContent) => {
    const hasContent = reportContent.trim() !== '';
    loadTemplate(template);
    toast({
      title: hasContent ? "Template adicionado" : "Template carregado",
      description: hasContent 
        ? `"${template.name}" adicionado ao relatório.`
        : `"${template.name}" está pronto para edição.`
    });
  }, [loadTemplate, reportContent, toast]);

  const handleTranscriptionUpdate = useCallback((text: string) => {
    setReportContent(reportContent + ' ' + text);
  }, [reportContent, setReportContent]);

  const handleExportPDF = useCallback(() => {
    if (!reportContent.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não há conteúdo para exportar"
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Médico', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    if (selectedTemplate) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo: ${selectedTemplate.name}`, margin, yPosition);
      yPosition += lineHeight;
    }

    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, margin, yPosition);
    yPosition += lineHeight * 2;

    doc.setFontSize(11);
    const lines = doc.splitTextToSize(reportContent, pageWidth - margin * 2);
    
    for (const line of lines) {
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    const filename = selectedTemplate 
      ? `relatorio-${selectedTemplate.id}-${new Date().toISOString().slice(0, 10)}.pdf`
      : `relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
    
    doc.save(filename);
    
    toast({
      title: "PDF exportado",
      description: "O relatório foi guardado com sucesso."
    });
  }, [reportContent, selectedTemplate, toast]);

  const handleReset = useCallback(() => {
    resetEditor();
    toast({
      title: "Editor limpo",
      description: "Todos os dados foram removidos."
    });
  }, [resetEditor, toast]);

  const handleReprocess = useCallback(async () => {
    if (!audioBlob || !selectedTemplate) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "É necessário ter um áudio e template selecionados para reprocessar."
      });
      return;
    }

    await processWithN8n({
      audioBlob,
      templateType: selectedTemplate.name,
      templateText: selectedTemplate.baseText,
      reportStylePreferences,
    });
  }, [audioBlob, selectedTemplate, processWithN8n, toast, reportStylePreferences]);

  const handleNextReport = useCallback(async () => {
    if (!reportContent.trim() || !selectedTemplate) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um template e adicione conteúdo antes de guardar."
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      let audioPath: string | null = null;

      // Upload audio if exists
      if (audioBlob) {
        const audioFileName = `reports/${user.id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('medical-files')
          .upload(audioFileName, audioBlob, {
            contentType: 'audio/webm',
          });

        if (uploadError) {
          console.error('Audio upload error:', uploadError);
        } else {
          audioPath = audioFileName;
        }
      }

      // Save report to database
      const isDark = document.documentElement.classList.contains('dark');
      const { error: insertError } = await supabase
        .from('completed_reports')
        .insert({
          user_id: user.id,
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          report_content: reportContent,
          audio_url: audioPath,
          audio_duration: recordingDuration || null,
          used_dark_mode: isDark,
          used_voice_commands: voiceCommandsEnabled,
          used_verification: isReportGenerated,
        });

      if (insertError) throw insertError;

      // Reset editor for next report
      resetEditor();

      toast({
        title: "Relatório guardado",
        description: "Pronto para o próximo relatório!"
      });

    } catch (err) {
      console.error('Error saving report:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível guardar o relatório."
      });
    } finally {
      setIsSaving(false);
    }
  }, [reportContent, selectedTemplate, audioBlob, recordingDuration, resetEditor, toast]);

  // Subscribe to voice commands for actions that need component context
  useEffect(() => {
    const unsubscribe = subscribeToVoiceCommands((action) => {
      switch (action) {
        case 'NEXT_REPORT':
          handleNextReport();
          break;
        case 'REPROCESS_REPORT':
          handleReprocess();
          break;
        case 'PLAY_AUDIO':
          toast({
            title: "Reproduzir áudio",
            description: audioBlob ? "Funcionalidade disponível no relatório guardado." : "Nenhum áudio disponível."
          });
          break;
      }
    });

    return unsubscribe;
  }, [handleNextReport, handleReprocess, audioBlob, toast]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header with Tabs */}
      <header className="h-10 shrink-0 border-b border-border bg-card flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary">
            <FileText className="w-4 h-4" />
            <span className="font-semibold text-sm">MedReport</span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-7 p-0.5 bg-muted/50">
              <TabsTrigger value="profile" className="h-6 text-xs px-2.5 gap-1">
                <User className="w-3 h-3" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="new" className="h-6 text-xs px-2.5 gap-1">
                <Plus className="w-3 h-3" />
                Novos Relatórios
              </TabsTrigger>
              <TabsTrigger value="history" className="h-6 text-xs px-2.5 gap-1" data-tutorial="completed-reports">
                <FolderOpen className="w-3 h-3" />
                Relatórios
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={startTutorial}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Tour sobre as funcionalidades</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <div data-tutorial="voice-commands">
            <VoiceCommandsToggle />
          </div>

          <DarkModeToggle />

          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
            <LogOut className="w-3 h-3" />
            Sair
          </Button>
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'profile' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProfileTab />
        </div>
      ) : activeTab === 'new' ? (
        <div className="flex-1 flex min-h-0">
          {/* Template Sidebar - Collapsible */}
          <div
            data-tutorial="templates-sidebar"
            className={cn(
              "shrink-0 transition-all duration-300 overflow-hidden",
              isTemplateSidebarMinimized ? "w-0" : "w-48"
            )}
          >
            {!isTemplateSidebarMinimized && (
              <TemplateSidebar onTemplateSelect={handleTemplateSelect} />
            )}
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Recording Controls Row */}
            <div className="shrink-0 px-2 py-1 border-b border-border bg-card/50 flex items-center gap-2">
              {/* Sidebar Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTemplateSidebarMinimized(!isTemplateSidebarMinimized)}
                className="h-7 w-7 p-0"
                title={isTemplateSidebarMinimized ? "Mostrar Templates" : "Ocultar Templates"}
              >
                {isTemplateSidebarMinimized ? (
                  <PanelLeft className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                )}
              </Button>
              
              <div className="w-px h-4 bg-border" />
              
              <div data-tutorial="record-button">
                <CompactRecordingControls onTranscriptionUpdate={handleTranscriptionUpdate} />
              </div>
              
              <div className="w-px h-4 bg-border" />
              
              <CompactAudioUpload onTranscriptionComplete={handleTranscriptionUpdate} />
              
              <div className="w-px h-4 bg-border" />
              
              <div className="flex items-center gap-1" data-tutorial="action-bar">
                {/* Reprocess Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReprocess}
                  disabled={isProcessing || !audioBlob || !selectedTemplate}
                  className="gap-1 h-7 text-xs px-2"
                  title="Reprocessar o áudio com o template atual"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Reprocessar
                </Button>
                
                {/* Reset Button */}
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 h-7 text-xs px-2">
                  <RotateCcw className="w-3 h-3" />
                  Limpar
                </Button>
              </div>
              
              {/* Style Preferences Button */}
              <div data-tutorial="style-preferences">
                <StylePreferencesDialog />
              </div>
              
              {/* Next Report Button */}
              <div className="ml-auto" data-tutorial="next-report">
                <Button
                  onClick={handleNextReport}
                  disabled={isSaving || !reportContent.trim() || !selectedTemplate}
                  size="sm"
                  variant="default"
                  className="gap-1.5 h-7 text-xs bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)] text-primary-foreground"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  Próximo Relatório
                </Button>
              </div>
            </div>

            {/* Report Editor with Textos Automáticos Sidebar */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Report Editor */}
              <div className="flex-1 min-h-0 overflow-hidden" data-tutorial="report-editor">
                <ReportEditor onExportPDF={handleExportPDF} />
              </div>
              
              {/* Right Sidebar: Textos Automáticos during dictation, Verification after report generated */}
              {isReportGenerated ? (
                <div data-tutorial="verification-panel" className="h-full">
                  <ReportVerification />
                </div>
              ) : (
                <div data-tutorial="auto-texts" className="h-full">
                  <ClinicalAutoText />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CompletedReportsList />
        </div>
      )}
      {/* Tutorial Overlay */}
      <TutorialOverlay />
    </div>
  );
}
