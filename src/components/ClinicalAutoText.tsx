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

  // AutoText is visible when at least one template is selected
  const shouldBeVisible = activeTemplates.length > 0 && !manuallyHidden;

  const handleInsertText = useCallback((text: string) => {
    const newContent = reportContent ? reportContent + ' ' + text : text;
    setReportContent(newContent);
    
    toast({
      title: "Texto inserido",
      description: text.substring(0, 30) + (text.length > 30 ? '...' : '')
    });
  }, [reportContent, setReportContent, toast]);

  // If not visible, show a minimal collapsed tab or nothing
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
              title="Mostrar AutoTexto"
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
      <div className="w-44 h-full bg-muted/20 flex flex-col border-l border-border">
        {/* Header */}
        <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">AutoTexto</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setManagerOpen(true)}
              className="h-5 w-5 p-0"
              title="Gerir AutoTextos"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setManuallyHidden(true)}
              className="h-5 w-5 p-0"
              title="Ocultar AutoTexto"
            >
              <PanelRightClose className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-2">
            {/* User's custom terms first */}
            {customTerms.length > 0 && (
              <div>
                <p className="text-[9px] font-medium text-primary uppercase tracking-wider px-1.5 mb-0.5">
                  Meus Textos
                </p>
                <div className="space-y-0">
                  {customTerms.map((term, index) => (
                    <button
                      key={`custom-${index}`}
                      onClick={() => handleInsertText(term)}
                      className="w-full text-left px-1.5 py-0.5 text-[10px] rounded transition-colors leading-tight hover:bg-accent/50 cursor-pointer"
                      title={term}
                    >
                      {term.length > 40 ? term.substring(0, 40) + '...' : term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AutoTexts grouped by active template */}
            {activeTemplates.map((template) => {
              const templateAutoTexts = template.autoTexts || [];
              if (templateAutoTexts.length === 0) return null;

              return (
                <div key={template.id}>
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-1.5 mb-0.5">
                    {template.name}
                  </p>
                  <div className="space-y-0">
                    {templateAutoTexts.map((item) => (
                      <button
                        key={`${template.id}-${item.keyword}`}
                        onClick={() => handleInsertText(item.text)}
                        className="w-full text-left px-1.5 py-0.5 text-[10px] rounded transition-colors leading-tight hover:bg-accent/50 cursor-pointer"
                        title={item.text}
                      >
                        {item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {activeTemplates.every(t => (t.autoTexts || []).length === 0) && customTerms.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-1.5 py-2 text-center">
                Sem autotextos para {activeTemplates.length > 1 ? 'estas templates' : 'esta template'}.
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
