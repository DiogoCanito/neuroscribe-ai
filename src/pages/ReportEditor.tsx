import { useCallback } from 'react';
import { TemplateSidebar } from '@/components/TemplateSidebar';
import { RecordingControls } from '@/components/RecordingControls';
import { ReportEditor } from '@/components/ReportEditor';
import { VoiceCommandsToggle } from '@/components/VoiceCommandsToggle';
import { AudioUpload } from '@/components/AudioUpload';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateContent } from '@/types/templates';
import { Button } from '@/components/ui/button';
import { FileText, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

export default function ReportEditorPage() {
  const { toast } = useToast();
  const { 
    selectedTemplate, 
    loadTemplate, 
    reportContent,
    setReportContent, 
    resetEditor,
    originalTranscription
  } = useEditorStore();

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

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Médico', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    // Template name
    if (selectedTemplate) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo: ${selectedTemplate.name}`, margin, yPosition);
      yPosition += lineHeight;
    }

    // Date
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Content
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

    // Save
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-6 h-6" />
            <span className="font-semibold text-lg">MedReport</span>
          </div>
          
          {selectedTemplate && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-muted-foreground text-sm">Template:</span>
              <span className="font-medium text-sm">{selectedTemplate.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <VoiceCommandsToggle />
          
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            Limpar
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Template Sidebar */}
        <TemplateSidebar onTemplateSelect={handleTemplateSelect} />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Recording Controls + Audio Upload */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex gap-4">
              <div className="flex-1">
                <RecordingControls onTranscriptionUpdate={handleTranscriptionUpdate} />
              </div>
              <div className="w-72">
                <AudioUpload onTranscriptionComplete={handleTranscriptionUpdate} />
              </div>
            </div>
          </div>

          {/* Report Editor */}
          <ReportEditor onExportPDF={handleExportPDF} />
        </div>
      </div>
    </div>
  );
}
