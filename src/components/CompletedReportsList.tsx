import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Play, Trash2, Loader2, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import jsPDF from 'jspdf';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CompletedReport {
  id: string;
  template_id: string | null;
  template_name: string;
  report_content: string;
  audio_url: string | null;
  audio_duration: number | null;
  created_at: string;
}

export function CompletedReportsList() {
  const { toast } = useToast();
  const [reports, setReports] = useState<CompletedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CompletedReport | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('completed_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os relatórios."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('completed_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReports(reports.filter(r => r.id !== id));
      toast({
        title: "Relatório eliminado",
        description: "O relatório foi removido com sucesso."
      });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível eliminar o relatório."
      });
    }
  };

  const handleExportPDF = (report: CompletedReport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Médico', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo: ${report.template_name}`, margin, yPosition);
    yPosition += lineHeight;

    doc.text(`Data: ${format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy", { locale: pt })}`, margin, yPosition);
    yPosition += lineHeight * 2;

    doc.setFontSize(11);
    const lines = doc.splitTextToSize(report.report_content, pageWidth - margin * 2);
    
    for (const line of lines) {
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    const filename = `relatorio-${report.template_name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(report.created_at), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    
    toast({
      title: "PDF exportado",
      description: "O relatório foi guardado com sucesso."
    });
  };

  const handlePlayAudio = async (report: CompletedReport) => {
    if (!report.audio_url) return;

    if (playingAudio === report.id && audioElement) {
      audioElement.pause();
      setPlayingAudio(null);
      setAudioElement(null);
      return;
    }

    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
    }

    try {
      const { data } = await supabase.storage
        .from('medical-files')
        .createSignedUrl(report.audio_url, 3600);

      if (data?.signedUrl) {
        const audio = new Audio(data.signedUrl);
        audio.onended = () => {
          setPlayingAudio(null);
          setAudioElement(null);
        };
        audio.play();
        setPlayingAudio(report.id);
        setAudioElement(audio);
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível reproduzir o áudio."
      });
    }
  };

  const handleDownloadAudio = async (report: CompletedReport) => {
    if (!report.audio_url) return;

    try {
      const { data } = await supabase.storage
        .from('medical-files')
        .download(report.audio_url);

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio-${report.template_name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(report.created_at), 'yyyy-MM-dd')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading audio:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível descarregar o áudio."
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Sem relatórios</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Os relatórios concluídos aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <h4 className="font-medium text-sm truncate">{report.template_name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] font-medium">
                      Concluído
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(report.created_at), "dd MMM yyyy", { locale: pt })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(report.created_at), "HH:mm")}
                    </span>
                    {report.audio_duration && (
                      <span className="text-muted-foreground/70">
                        Áudio: {formatDuration(report.audio_duration)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">
                    {report.report_content.slice(0, 150)}...
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedReport(report)}
                    title="Ver relatório"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleExportPDF(report)}
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  
                  {report.audio_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePlayAudio(report)}
                      title={playingAudio === report.id ? "Parar" : "Reproduzir áudio"}
                    >
                      <Play className={`w-4 h-4 ${playingAudio === report.id ? 'text-primary' : ''}`} />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar relatório?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser revertida. O relatório e o áudio associado serão permanentemente eliminados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(report.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedReport?.template_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 text-sm text-muted-foreground border-b pb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {selectedReport && format(new Date(selectedReport.created_at), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {selectedReport && format(new Date(selectedReport.created_at), "HH:mm")}
            </span>
          </div>
          <ScrollArea className="max-h-[50vh]">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {selectedReport?.report_content}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2 border-t">
            {selectedReport?.audio_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReport && handlePlayAudio(selectedReport)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  {playingAudio === selectedReport?.id ? 'Parar' : 'Reproduzir'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReport && handleDownloadAudio(selectedReport)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Áudio
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => selectedReport && handleExportPDF(selectedReport)}
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
