import { useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/stores/editorStore';
import { frequentTerms } from '@/data/templates';
import { RichTextEditor } from '@/components/RichTextEditor';
import { TextManipulationDialog } from '@/components/TextManipulationDialog';
import { AutoTextDialog } from '@/components/AutoTextDialog';
import { 
  Search, 
  Copy, 
  FileDown, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReportEditorProps {
  onExportPDF: () => void;
}

export function ReportEditor({ onExportPDF }: ReportEditorProps) {
  const { toast } = useToast();
  const [termsOpen, setTermsOpen] = useState(true);
  
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

  const handleInsertTerm = useCallback((term: string) => {
    document.execCommand('insertText', false, term);
  }, []);

  // Group terms by category
  const termsByCategory = frequentTerms.reduce((acc, term) => {
    const category = term.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(term);
    return acc;
  }, {} as Record<string, typeof frequentTerms>);

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

        <div className="h-3 w-px bg-border" />
        
        <TextManipulationDialog />
        <AutoTextDialog />
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

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Editor - Maximum space */}
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

        {/* Compact Frequent Terms Sidebar */}
        <div className="w-40 shrink-0 border-l border-border bg-muted/20 flex flex-col min-h-0 overflow-hidden">
          <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-2 py-1 rounded-none border-b border-border h-auto"
              >
                <span className="text-[10px] font-medium uppercase tracking-wide">Termos</span>
                {termsOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
                <div className="p-1.5 space-y-1.5">
                  {Object.entries(termsByCategory).map(([category, terms]) => (
                    <div key={category}>
                      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-1.5 mb-0.5">
                        {category}
                      </p>
                      <div className="space-y-0">
                        {terms.map((term) => (
                          <button
                            key={term.id}
                            onClick={() => handleInsertTerm(term.term)}
                            disabled={!selectedTemplate}
                            className={cn(
                              "w-full text-left px-1.5 py-0.5 text-[10px] rounded transition-colors",
                              selectedTemplate 
                                ? "hover:bg-accent/50 cursor-pointer" 
                                : "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {term.term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
