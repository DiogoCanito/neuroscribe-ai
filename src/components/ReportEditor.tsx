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
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFindReplace(!showFindReplace)}
          className="gap-1.5"
        >
          <Search className="w-4 h-4" />
          Localizar
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
          <Copy className="w-4 h-4" />
          Copiar
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onExportPDF} className="gap-1.5">
          <FileDown className="w-4 h-4" />
          PDF
        </Button>
      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/20">
          <Input
            placeholder="Localizar..."
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="w-40 h-8 text-sm"
          />
          <Input
            placeholder="Substituir por..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-40 h-8 text-sm"
          />
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleFindReplace(false)}
            disabled={!findText}
          >
            Substituir
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleFindReplace(true)}
            disabled={!findText}
          >
            Substituir Tudo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowFindReplace(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 p-4">
          <Textarea
            ref={textareaRef}
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder={selectedTemplate 
              ? "O relatório será apresentado aqui. Comece a gravar para adicionar conteúdo."
              : "Selecione um template para começar..."
            }
            className="h-full resize-none font-mono text-sm leading-relaxed"
            disabled={!selectedTemplate}
          />
        </div>

        {/* Frequent Terms Sidebar */}
        <div className="w-56 border-l border-border bg-muted/20 flex flex-col">
          <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 rounded-none border-b border-border"
              >
                <span className="text-sm font-medium">Termos Frequentes</span>
                {termsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="p-2 space-y-3">
                  {Object.entries(termsByCategory).map(([category, terms]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                        {category}
                      </p>
                      <div className="space-y-0.5">
                        {terms.map((term) => (
                          <button
                            key={term.id}
                            onClick={() => handleInsertTerm(term.term)}
                            disabled={!selectedTemplate}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs rounded transition-colors",
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
