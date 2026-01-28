import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Replace, 
  Highlighter, 
  List, 
  Plus, 
  Trash2, 
  Edit2,
  X
} from 'lucide-react';

export function TextManipulationDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Local state for new entries
  const [newRule, setNewRule] = useState({ from: '', to: '' });
  const [newTerm, setNewTerm] = useState('');
  
  const { 
    reportContent, 
    setReportContent,
    // Global state from store
    replacementRules,
    addReplacementRule,
    deleteReplacementRule,
    customTerms,
    addCustomTerm,
    deleteCustomTerm,
  } = useEditorStore();

  // Add new rule
  const handleAddRule = () => {
    if (!newRule.from.trim() || !newRule.to.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha ambos os campos"
      });
      return;
    }
    
    addReplacementRule({
      from: newRule.from.trim(),
      to: newRule.to.trim(),
      autoApply: true
    });
    
    setNewRule({ from: '', to: '' });
    toast({
      title: "Regra criada",
      description: `"${newRule.from}" → "${newRule.to}"`
    });
  };

  // Highlight handler
  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      toast({
        variant: "destructive",
        title: "Selecione texto",
        description: "Selecione o texto que deseja destacar no editor"
      });
      return;
    }
    
    const selectedText = selection.toString();
    const highlightedText = `**${selectedText}**`;
    const newContent = reportContent.replace(selectedText, highlightedText);
    setReportContent(newContent);
    
    toast({
      title: "Texto destacado",
      description: `"${selectedText.slice(0, 30)}${selectedText.length > 30 ? '...' : ''}"`
    });
  };

  // Terms handlers
  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    addCustomTerm(newTerm.trim());
    setNewTerm('');
    toast({ title: "Termo adicionado" });
  };

  const handleInsertTerm = (term: string) => {
    setReportContent(reportContent + ' ' + term);
    setOpen(false);
    toast({ title: "Termo inserido" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-6 text-[11px] px-2">
          <Edit2 className="w-3 h-3" />
          Texto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manipulação de Texto</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="find-replace" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="find-replace" className="gap-2">
              <Replace className="w-4 h-4" />
              Localizar
            </TabsTrigger>
            <TabsTrigger value="highlight" className="gap-2">
              <Highlighter className="w-4 h-4" />
              Highlight
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-2">
              <List className="w-4 h-4" />
              Termos
            </TabsTrigger>
          </TabsList>
          
          {/* Tab: Find & Replace */}
          <TabsContent value="find-replace" className="space-y-4 mt-4">
            {/* Replacement Rules */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium">Regras de Substituição Automática</h4>
                <p className="text-xs text-muted-foreground">
                  Regras aplicadas automaticamente ao texto transcrito
                </p>
              </div>
              
              {/* Add new rule - moved to top */}
              <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Quando eu disser..."
                    value={newRule.from}
                    onChange={(e) => setNewRule({ ...newRule, from: e.target.value })}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    placeholder="Escreve..."
                    value={newRule.to}
                    onChange={(e) => setNewRule({ ...newRule, to: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddRule}
                    disabled={!newRule.from.trim() || !newRule.to.trim()}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Regra
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                  {replacementRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma regra criada. Adicione acima.
                    </p>
                  ) : (
                    replacementRules.map((rule) => (
                      <div 
                        key={rule.id}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm group"
                      >
                        <span className="font-mono bg-background px-2 py-0.5 rounded">{rule.from}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="flex-1">{rule.to}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            deleteReplacementRule(rule.id);
                            toast({ title: "Regra removida" });
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          {/* Tab: Highlight */}
          <TabsContent value="highlight" className="space-y-4 mt-4">
            <div className="text-center p-8 space-y-4">
              <Highlighter className="w-12 h-12 mx-auto text-primary/60" />
              <div className="space-y-2">
                <h4 className="font-medium">Destacar Texto</h4>
                <p className="text-sm text-muted-foreground">
                  Selecione o texto que pretende destacar no editor e clique no botão abaixo.
                </p>
              </div>
              <Button onClick={handleHighlight} className="gap-2">
                <Highlighter className="w-4 h-4" />
                Aplicar Destaque
              </Button>
              <p className="text-xs text-muted-foreground">
                O texto selecionado será formatado em <strong>negrito</strong>
              </p>
            </div>
          </TabsContent>
          
          {/* Tab: Frequent Terms */}
          <TabsContent value="terms" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium">Termos Frequentemente Utilizados</h4>
                <p className="text-xs text-muted-foreground">
                  Clique num termo para inserir no relatório. Lista guardada globalmente.
                </p>
              </div>
              
              <ScrollArea className="h-48 rounded-md border p-2">
                <div className="space-y-1">
                  {customTerms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum termo guardado. Adicione abaixo.
                    </p>
                  ) : (
                    customTerms.map((term, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 group"
                      >
                        <button
                          onClick={() => handleInsertTerm(term)}
                          className="flex-1 text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                        >
                          {term}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            deleteCustomTerm(index);
                            toast({ title: "Termo removido" });
                          }}
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {/* Add new term */}
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar novo termo..."
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleAddTerm}
                  disabled={!newTerm.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
