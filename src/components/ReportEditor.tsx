import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/stores/editorStore';
import { RichTextEditor } from '@/components/RichTextEditor';
import { 
  Search, 
  Copy, 
  FileDown,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportEditorProps {
  onExportPDF: () => void;
}

export function ReportEditor({ onExportPDF }: ReportEditorProps) {
  const { toast } = useToast();
  
  const {
    reportContent,
    setReportContent,
    showFindReplace,
    setShowFindReplace,
    findText,
    setFindText,
    replaceText,
    setReplaceText,
    findAndReplace,
    selectedTemplate
  } = useEditorStore();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      toast({
        title: "Copiado",
        description: "Relatório copiado para a área de transferência"
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível copiar o relatório"
      });
    }
  }, [reportContent, toast]);

  const handleFindReplace = useCallback((replaceAll: boolean) => {
    if (!findText) return;
    findAndReplace(findText, replaceText, replaceAll);
    toast({
      title: "Substituição realizada",
      description: replaceAll ? "Todas as ocorrências substituídas" : "Primeira ocorrência substituída"
    });
  }, [findText, replaceText, findAndReplace, toast]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Compact Toolbar - All tools in one line */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFindReplace(!showFindReplace)}
          className="gap-1 h-6 text-[11px] px-2"
        >
          <Search className="w-3 h-3" />
          Localizar
        </Button>
        
        <div className="h-3 w-px bg-border" />
        
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 h-6 text-[11px] px-2">
          <Copy className="w-3 h-3" />
          Copiar
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onExportPDF} className="gap-1 h-6 text-[11px] px-2">
          <FileDown className="w-3 h-3" />
          PDF
        </Button>

      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-b border-border bg-muted/20">
          <Input
            placeholder="Localizar..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="w-28 h-6 text-[11px]"
          />
          <Input
            placeholder="Substituir..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-28 h-6 text-[11px]"
          />
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleFindReplace(false)}
            disabled={!findText}
            className="h-6 text-[11px] px-2"
          >
            Substituir
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleFindReplace(true)}
            disabled={!findText}
            className="h-6 text-[11px] px-2"
          >
            Tudo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowFindReplace(false)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Editor - Full available space */}
      <div className="flex-1 p-2 min-h-0 overflow-hidden">
        <RichTextEditor
          value={reportContent}
          onChange={setReportContent}
          placeholder={selectedTemplate 
            ? "O relatório será apresentado aqui. Comece a gravar para adicionar conteúdo."
            : "Selecione um template para começar..."
          }
          disabled={!selectedTemplate}
          className="h-full"
        />
      </div>
    </div>
  );
}
