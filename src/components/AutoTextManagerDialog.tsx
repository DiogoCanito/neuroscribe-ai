import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/stores/editorStore';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AutoTextManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoTextManagerDialog({ open, onOpenChange }: AutoTextManagerDialogProps) {
  const { toast } = useToast();
  const { customTerms, addCustomTerm, deleteCustomTerm } = useEditorStore();
  
  const [newTerm, setNewTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddTerm = () => {
    if (!newTerm.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O texto não pode estar vazio."
      });
      return;
    }

    if (customTerms.includes(newTerm.trim())) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Este texto já existe."
      });
      return;
    }

    addCustomTerm(newTerm.trim());
    setNewTerm('');
    toast({
      title: "AutoTexto adicionado",
      description: "O novo texto foi guardado."
    });
  };

  const handleDeleteTerm = (index: number) => {
    deleteCustomTerm(index);
    toast({
      title: "AutoTexto removido",
      description: "O texto foi eliminado."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerir AutoTextos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Add new term */}
          <div className="space-y-2">
            <Label htmlFor="new-term" className="text-xs font-medium">
              Adicionar novo AutoTexto
            </Label>
            <div className="flex gap-2">
              <Textarea
                id="new-term"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Escreva o texto que pretende adicionar..."
                className="flex-1 min-h-[60px] text-xs resize-none"
              />
            </div>
            <Button
              onClick={handleAddTerm}
              size="sm"
              className="gap-1.5"
              disabled={!newTerm.trim()}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          </div>

          <div className="h-px bg-border" />

          {/* List of existing terms */}
          <div className="space-y-2 flex-1 min-h-0">
            <Label className="text-xs font-medium">
              AutoTextos existentes ({customTerms.length})
            </Label>
            <ScrollArea className="h-[250px] rounded-md border">
              <div className="p-2 space-y-1">
                {customTerms.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Ainda não tem AutoTextos personalizados.
                  </p>
                ) : (
                  customTerms.map((term, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md transition-colors",
                        "hover:bg-accent/50 group"
                      )}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <p className="flex-1 text-xs leading-relaxed break-words">
                        {term}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTerm(index)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
