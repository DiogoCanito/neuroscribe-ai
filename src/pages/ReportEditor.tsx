import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateSidebar } from '@/components/TemplateSidebar';
import { CompactRecordingControls } from '@/components/CompactRecordingControls';
import { ReportEditor } from '@/components/ReportEditor';
import { VoiceCommandsToggle } from '@/components/VoiceCommandsToggle';
import { CompactAudioUpload } from '@/components/CompactAudioUpload';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateContent } from '@/types/templates';
import { Button } from '@/components/ui/button';
import { FileText, RotateCcw, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

export default function ReportEditorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    selectedTemplate, 
    loadTemplate, 
    reportContent,
    setReportContent, 
    resetEditor,
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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Compact Header */}
      <header className="h-9 shrink-0 border-b border-border bg-card flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <FileText className="w-4 h-4" />
            <span className="font-semibold text-sm">MedReport</span>
          </div>
          
          {selectedTemplate && (
            <div className="flex items-center gap-1.5 ml-3 text-[11px]">
              <span className="text-muted-foreground">Template:</span>
              <span className="font-medium">{selectedTemplate.name}</span>
            </div>
          )}
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

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Template Sidebar - Compact */}
        <TemplateSidebar onTemplateSelect={handleTemplateSelect} />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Compact Recording Controls Row */}
          <div className="shrink-0 px-2 py-1 border-b border-border bg-card/50 flex items-center gap-2">
            <CompactRecordingControls onTranscriptionUpdate={handleTranscriptionUpdate} />
            <div className="w-px h-4 bg-border" />
            <CompactAudioUpload onTranscriptionComplete={handleTranscriptionUpdate} />
          </div>

          {/* Report Editor - Maximum space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ReportEditor onExportPDF={handleExportPDF} />
          </div>
        </div>
      </div>
    </div>
  );
}
