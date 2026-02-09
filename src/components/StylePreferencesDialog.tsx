import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [saving, setSaving] = useState(false);

  // Sync local value when store changes (e.g. after loading from DB)
  useEffect(() => {
    if (!open) setLocalValue(reportStylePreferences);
  }, [reportStylePreferences, open]);

  const handleOpen = () => {
    setLocalValue(reportStylePreferences);
    setOpen(true);
  };

  const handleSave = async () => {
    const trimmed = localValue.trim();
    setSaving(true);
    try {
      // Save to store (localStorage)
      setReportStylePreferences(trimmed);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ report_style_preferences: trimmed } as any)
          .eq('user_id', user.id);
      }

      setOpen(false);
      toast({
        title: "Preferências guardadas",
        description: "A IA vai adaptar os relatórios ao seu estilo.",
      });
    } catch (err) {
      console.error('Failed to save style preferences:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível guardar as preferências.",
      });
    } finally {
      setSaving(false);
    }
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
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Guardar Preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
