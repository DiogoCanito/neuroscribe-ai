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
  Search, 
  Replace, 
  Highlighter, 
  List, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplacementRule {
  id: string;
  from: string;
  to: string;
  autoApply: boolean;
}

interface TextManipulationDialogProps {
  disabled?: boolean;
}

export function TextManipulationDialog({ disabled }: TextManipulationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Find & Replace state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [rules, setRules] = useState<ReplacementRule[]>([
    { id: '1', from: 'pex', to: 'por exemplo', autoApply: true },
    { id: '2', from: 'dx', to: 'diagnóstico', autoApply: true },
    { id: '3', from: 'hx', to: 'história', autoApply: false },
  ]);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({ from: '', to: '', autoApply: false });
  
  // Custom terms state
  const [customTerms, setCustomTerms] = useState<string[]>([
    'Sem alterações significativas',
    'Estudo comparativo',
    'Aspetos pós-operatórios',
    'Em contexto clínico',
  ]);
  const [newTerm, setNewTerm] = useState('');
  
  const { 
    reportContent, 
    setReportContent,
    findAndReplace,
    selectedTemplate
  } = useEditorStore();

  // Find & Replace handlers
  const handleFindReplace = (all: boolean) => {
    if (!findText) return;
    findAndReplace(findText, replaceText, all);
    toast({
      title: "Substituição realizada",
      description: all ? "Todas as ocorrências substituídas" : "Primeira ocorrência substituída"
    });
  };

  const handleAddRule = () => {
    if (!newRule.from || !newRule.to) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha ambos os campos"
      });
      return;
    }
    
    setRules([...rules, { 
      id: Date.now().toString(), 
      ...newRule 
    }]);
    setNewRule({ from: '', to: '', autoApply: false });
    toast({
      title: "Regra adicionada",
      description: `"${newRule.from}" → "${newRule.to}"`
    });
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    toast({
      title: "Regra removida"
    });
  };

  const handleApplyRules = () => {
    let newContent = reportContent;
    let count = 0;
    
    rules.forEach(rule => {
      if (rule.autoApply) {
        const regex = new RegExp(`\\b${rule.from}\\b`, 'gi');
        const matches = newContent.match(regex);
        if (matches) {
          count += matches.length;
          newContent = newContent.replace(regex, rule.to);
        }
      }
    });
    
    if (count > 0) {
      setReportContent(newContent);
      toast({
        title: "Regras aplicadas",
        description: `${count} substituições realizadas`
      });
    } else {
      toast({
        title: "Nenhuma substituição",
        description: "Não foram encontradas correspondências"
      });
    }
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

  // Custom terms handlers
  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    setCustomTerms([...customTerms, newTerm.trim()]);
    setNewTerm('');
    toast({
      title: "Termo adicionado"
    });
  };

  const handleDeleteTerm = (index: number) => {
    setCustomTerms(customTerms.filter((_, i) => i !== index));
  };

  const handleInsertTerm = (term: string) => {
    setReportContent(reportContent + ' ' + term);
    setOpen(false);
    toast({
      title: "Termo inserido"
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={disabled || !selectedTemplate}
        >
          <Edit2 className="w-4 h-4" />
          Manipulação de Texto
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
            {/* Quick Find & Replace */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium">Localizar e Substituir</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Localizar..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Substituir por..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
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
              </div>
            </div>
            
            {/* Replacement Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Regras de Substituição Automática</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleApplyRules}
                  className="gap-1"
                >
                  <Save className="w-3 h-3" />
                  Aplicar Regras
                </Button>
              </div>
              
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div 
                      key={rule.id}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                    >
                      <span className="font-mono flex-1">{rule.from}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="flex-1">{rule.to}</span>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={rule.autoApply}
                          onChange={(e) => {
                            setRules(rules.map(r => 
                              r.id === rule.id 
                                ? { ...r, autoApply: e.target.checked }
                                : r
                            ));
                          }}
                          className="rounded"
                        />
                        Auto
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Add new rule */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Palavra..."
                  value={newRule.from}
                  onChange={(e) => setNewRule({ ...newRule, from: e.target.value })}
                  className="flex-1"
                />
                <span className="text-muted-foreground">→</span>
                <Input
                  placeholder="Substituir por..."
                  value={newRule.to}
                  onChange={(e) => setNewRule({ ...newRule, to: e.target.value })}
                  className="flex-1"
                />
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newRule.autoApply}
                    onChange={(e) => setNewRule({ ...newRule, autoApply: e.target.checked })}
                    className="rounded"
                  />
                  Auto
                </label>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleAddRule}
                  disabled={!newRule.from || !newRule.to}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
              <h4 className="text-sm font-medium">Termos Frequentemente Utilizados</h4>
              <p className="text-xs text-muted-foreground">
                Clique num termo para inserir no relatório. Personalize a lista conforme necessário.
              </p>
              
              <ScrollArea className="h-48 rounded-md border p-2">
                <div className="space-y-1">
                  {customTerms.map((term, index) => (
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
                        onClick={() => handleDeleteTerm(index)}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
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
