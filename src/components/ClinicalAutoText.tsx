import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { Zap, PanelRightClose, PanelRight } from 'lucide-react';

export function ClinicalAutoText() {
  const { 
    activeTemplates,
    customTerms,
  } = useEditorStore();
  const [manuallyHidden, setManuallyHidden] = useState(false);

  const shouldBeVisible = activeTemplates.length > 0 && !manuallyHidden;

  if (!shouldBeVisible) {
    if (activeTemplates.length > 0 && manuallyHidden) {
      return (
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
      );
    }
    return null;
  }

  return (
    <div className="w-56 h-full bg-muted/20 flex flex-col border-l border-border">
      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Textos Automáticos</span>
        </div>
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
                  <div
                    key={`custom-${index}`}
                    className="px-2 py-1.5 rounded-md border border-transparent"
                  >
                    <p className="text-xs text-foreground leading-relaxed">{term}</p>
                  </div>
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
                    <div
                      key={`${template.id}-${item.keyword}`}
                      className="px-2 py-1.5 rounded-md border border-transparent"
                    >
                      <p className="text-xs font-semibold text-foreground mb-0.5">{item.keyword}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
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
  );
}
