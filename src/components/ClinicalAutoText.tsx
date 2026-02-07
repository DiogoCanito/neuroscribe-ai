import { useCallback, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { Zap, Settings, PanelRightClose, PanelRight } from 'lucide-react';
import { AutoTextManagerDialog } from './AutoTextManagerDialog';

export function ClinicalAutoText() {
  const { toast } = useToast();
  const { 
    reportContent, 
    setReportContent, 
    activeTemplates,
    customTerms,
  } = useEditorStore();
  const [managerOpen, setManagerOpen] = useState(false);
  const [manuallyHidden, setManuallyHidden] = useState(false);

  const shouldBeVisible = activeTemplates.length > 0 && !manuallyHidden;

  const handleInsertText = useCallback((text: string) => {
    const newContent = reportContent ? reportContent + ' ' + text : text;
    setReportContent(newContent);
    
    toast({
      title: "Texto inserido",
      description: text.substring(0, 30) + (text.length > 30 ? '...' : '')
    });
  }, [reportContent, setReportContent, toast]);

  if (!shouldBeVisible) {
    if (activeTemplates.length > 0 && manuallyHidden) {
      return (
        <>
          <div className="shrink-0 flex items-center border-l border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setManuallyHidden(false)}
              className="h-full w-7 rounded-none p-0"
              title="Mostrar Textos Automáticos"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <AutoTextManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
        </>
      );
    }
    
    return <AutoTextManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />;
  }

  return (
    <>
      <div className="w-56 h-full bg-muted/20 flex flex-col border-l border-border">
        {/* Header */}
        <div className="px-2.5 py-1.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Textos Automáticos</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setManagerOpen(true)}
              className="h-5 w-5 p-0"
              title="Gerir Textos Automáticos"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setManuallyHidden(true)}
              className="h-5 w-5 p-0"
              title="Ocultar Textos Automáticos"
            >
              <PanelRightClose className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-2.5 space-y-4">
            {/* User's custom terms first */}
            {customTerms.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider px-1 mb-1.5">
                  Meus Textos
                </p>
                <div className="space-y-1.5">
                  {customTerms.map((term, index) => (
                    <button
                      key={`custom-${index}`}
                      onClick={() => handleInsertText(term)}
                      className="w-full text-left px-2 py-1.5 rounded-md transition-colors hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border"
                    >
                      <p className="text-xs text-foreground leading-relaxed">{term}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Texts grouped by active template */}
            {activeTemplates.map((template) => {
              const templateAutoTexts = template.autoTexts || [];
              if (templateAutoTexts.length === 0) return null;

              return (
                <div key={template.id}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                    {template.name}
                  </p>
                  <div className="space-y-1.5">
                    {templateAutoTexts.map((item) => (
                      <button
                        key={`${template.id}-${item.keyword}`}
                        onClick={() => handleInsertText(item.text)}
                        className="w-full text-left px-2 py-1.5 rounded-md transition-colors hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border"
                      >
                        <p className="text-xs font-semibold text-foreground mb-0.5">{item.keyword}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {activeTemplates.every(t => (t.autoTexts || []).length === 0) && customTerms.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-3 text-center">
                Sem textos automáticos para {activeTemplates.length > 1 ? 'estas templates' : 'esta template'}.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Manager Dialog */}
      <AutoTextManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}
