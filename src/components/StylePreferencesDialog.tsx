import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { Bot } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

export function StylePreferencesDialog() {
  const { toast } = useToast();
  const { reportStylePreferences, setReportStylePreferences } = useEditorStore();
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(reportStylePreferences);

  const handleOpen = () => {
    setLocalValue(reportStylePreferences);
    setOpen(true);
  };

  const handleSave = () => {
    setReportStylePreferences(localValue.trim());
    setOpen(false);
    toast({
      title: "Preferências guardadas",
      description: "A IA vai adaptar os relatórios ao seu estilo.",
    });
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleOpen}
        className="gap-1.5 h-7 text-xs"
      >
        <Bot className="w-3.5 h-3.5" />
        Vamos melhorar juntos!
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Vamos melhorar juntos!
            </DialogTitle>
            <DialogDescription>
              Diz-nos como gostas que os teus relatórios sejam escritos. A IA vai adaptar-se ao teu estilo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="Ex.: Prefiro conclusões mais detalhadas, linguagem mais formal, conclusões em pontos, menos texto no relatório…"
              className="min-h-[150px] text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Estas preferências aplicam-se a todos os relatórios gerados por IA. Pode alterá-las a qualquer momento.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar Preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
