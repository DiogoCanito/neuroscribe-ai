import { useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/stores/editorStore';
import { frequentTerms } from '@/data/templates';
import { 
  Search, 
  Replace, 
  Copy, 
  FileDown, 
  Highlighter,
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
import { useState } from 'react';

interface ReportEditorProps {
  onExportPDF: () => void;
}

export function ReportEditor({ onExportPDF }: ReportEditorProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    insertText,
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
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = 
        reportContent.slice(0, start) + 
        term + 
        reportContent.slice(end);
      setReportContent(newContent);
      
      // Focus and move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + term.length, start + term.length);
        }
      }, 0);
    } else {
      insertText(term);
    }
  }, [reportContent, setReportContent, insertText]);

  // Group terms by category
  const termsByCategory = frequentTerms.reduce((acc, term) => {
    const category = term.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(term);
    return acc;
  }, {} as Record<string, typeof frequentTerms>);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 p-2 border-b border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFindReplace(!showFindReplace)}
          className="gap-1.5 h-7 text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          Localizar
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 h-7 text-xs">
          <Copy className="w-3.5 h-3.5" />
          Copiar
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onExportPDF} className="gap-1.5 h-7 text-xs">
          <FileDown className="w-3.5 h-3.5" />
          PDF
        </Button>
      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="shrink-0 flex items-center gap-2 p-2 border-b border-border bg-muted/20">
          <Input
            placeholder="Localizar..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="w-32 h-7 text-xs"
          />
          <Input
            placeholder="Substituir..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-32 h-7 text-xs"
          />
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleFindReplace(false)}
            disabled={!findText}
            className="h-7 text-xs"
          >
            Substituir
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleFindReplace(true)}
            disabled={!findText}
            className="h-7 text-xs"
          >
            Tudo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowFindReplace(false)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 p-3 min-h-0 overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder={selectedTemplate 
              ? "O relatório será apresentado aqui. Comece a gravar para adicionar conteúdo."
              : "Selecione um template para começar..."
            }
            className="h-full w-full resize-none font-mono text-sm leading-relaxed overflow-auto"
            disabled={!selectedTemplate}
          />
        </div>

        {/* Frequent Terms Sidebar */}
        <div className="w-48 shrink-0 border-l border-border bg-muted/20 flex flex-col min-h-0 overflow-hidden">
          <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 rounded-none border-b border-border h-auto"
              >
                <span className="text-xs font-medium">Termos Frequentes</span>
                {termsOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
                <div className="p-2 space-y-2">
                  {Object.entries(termsByCategory).map(([category, terms]) => (
                    <div key={category}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                        {category}
                      </p>
                      <div className="space-y-0.5">
                        {terms.map((term) => (
                          <button
                            key={term.id}
                            onClick={() => handleInsertTerm(term.term)}
                            disabled={!selectedTemplate}
                            className={cn(
                              "w-full text-left px-2 py-1 text-[11px] rounded transition-colors",
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
