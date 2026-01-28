import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateSidebar } from '@/components/TemplateSidebar';
import { CompactRecordingControls } from '@/components/CompactRecordingControls';
import { ReportEditor } from '@/components/ReportEditor';
import { VoiceCommandsToggle } from '@/components/VoiceCommandsToggle';
import { CompactAudioUpload } from '@/components/CompactAudioUpload';
import { CompletedReportsList } from '@/components/CompletedReportsList';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateContent } from '@/types/templates';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, RotateCcw, LogOut, Plus, FolderOpen, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

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
  } = useEditorStore();

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast({
      title: "Sessão terminada",
      description: "Até breve!"
    });
  }, [navigate, toast]);

  const handleTemplateSelect = useCallback((template: TemplateContent) => {
    loadTemplate(template);
    toast({
      title: "Template carregado",
      description: `"${template.name}" está pronto para edição.`
    });
  }, [loadTemplate, toast]);

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
      const { error: insertError } = await supabase
        .from('completed_reports')
        .insert({
          user_id: user.id,
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          report_content: reportContent,
          audio_url: audioPath,
          audio_duration: recordingDuration || null,
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
              <TabsTrigger value="new" className="h-6 text-xs px-2.5 gap-1">
                <Plus className="w-3 h-3" />
                Novos Relatórios
              </TabsTrigger>
              <TabsTrigger value="history" className="h-6 text-xs px-2.5 gap-1">
                <FolderOpen className="w-3 h-3" />
                Relatórios
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-1">
          <VoiceCommandsToggle />
          
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 h-7 text-xs px-2">
            <RotateCcw className="w-3 h-3" />
            Limpar
          </Button>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
            <LogOut className="w-3 h-3" />
            Sair
          </Button>
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'new' ? (
        <div className="flex-1 flex min-h-0">
          {/* Template Sidebar */}
          <TemplateSidebar onTemplateSelect={handleTemplateSelect} />

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Recording Controls Row */}
            <div className="shrink-0 px-2 py-1 border-b border-border bg-card/50 flex items-center gap-2">
              <CompactRecordingControls onTranscriptionUpdate={handleTranscriptionUpdate} />
              <div className="w-px h-4 bg-border" />
              <CompactAudioUpload onTranscriptionComplete={handleTranscriptionUpdate} />
              
              {/* Next Report Button */}
              <div className="ml-auto">
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

            {/* Report Editor */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ReportEditor onExportPDF={handleExportPDF} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CompletedReportsList />
        </div>
      )}
    </div>
  );
}
