import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  MessageSquare,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCommand {
  id: string;
  keyword: string;
  action: 'insert' | 'replace';
  text: string;
  templateId?: string; // If null, applies globally
}

interface AutoTextDialogProps {
  disabled?: boolean;
}

export function AutoTextDialog({ disabled }: AutoTextDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  
  const { 
    selectedTemplate,
    reportContent,
    setReportContent,
    applyAutoText
  } = useEditorStore();

  // Voice commands state
  const [commands, setCommands] = useState<VoiceCommand[]>([
    { 
      id: '1', 
      keyword: 'conclusão normal', 
      action: 'insert', 
      text: 'Exame sem alterações significativas. Achados de características normais.',
      templateId: undefined 
    },
    { 
      id: '2', 
      keyword: 'técnica padrão', 
      action: 'insert', 
      text: 'Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2 e STIR.',
      templateId: undefined 
    },
    { 
      id: '3', 
      keyword: 'sem derrame', 
      action: 'insert', 
      text: 'Sem evidência de derrame articular significativo.',
      templateId: undefined 
    },
    { 
      id: '4', 
      keyword: 'alinhamento normal', 
      action: 'insert', 
      text: 'Mantido o alinhamento fisiológico.',
      templateId: undefined 
    },
  ]);

  const [newCommand, setNewCommand] = useState({
    keyword: '',
    text: '',
    action: 'insert' as const,
    templateSpecific: false
  });

  // Filter commands based on current template
  const filteredCommands = useMemo(() => {
    return commands.filter(cmd => 
      !cmd.templateId || cmd.templateId === selectedTemplate?.id
    );
  }, [commands, selectedTemplate]);

  // Template-specific commands from the selected template
  const templateAutoTexts = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.autoTexts || [];
  }, [selectedTemplate]);

  const handleAddCommand = () => {
    if (!newCommand.keyword.trim() || !newCommand.text.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha a palavra-chave e o texto"
      });
      return;
    }

    const command: VoiceCommand = {
      id: Date.now().toString(),
      keyword: newCommand.keyword.toLowerCase().trim(),
      action: newCommand.action,
      text: newCommand.text.trim(),
      templateId: newCommand.templateSpecific ? selectedTemplate?.id : undefined
    };

    setCommands([...commands, command]);
    setNewCommand({ keyword: '', text: '', action: 'insert', templateSpecific: false });
    
    toast({
      title: "Comando criado",
      description: `Diga "${command.keyword}" para inserir o texto`
    });
  };

  const handleDeleteCommand = (id: string) => {
    setCommands(commands.filter(c => c.id !== id));
    toast({ title: "Comando removido" });
  };

  const handleInsertText = (text: string) => {
    setReportContent(reportContent + ' ' + text);
    toast({ title: "Texto inserido" });
  };

  const handleTestCommand = (command: VoiceCommand) => {
    handleInsertText(command.text);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={disabled || !selectedTemplate}
        >
          <MessageSquare className="w-4 h-4" />
          AutoTexto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Comandos por Voz (AutoTexto)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Auto-texts */}
          {templateAutoTexts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">AutoTextos do Template</h4>
                <Badge variant="secondary" className="text-xs">
                  {selectedTemplate?.name}
                </Badge>
              </div>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-2">
                  {templateAutoTexts.map((autoText, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-2 bg-muted/30 rounded text-sm group"
                    >
                      <Badge variant="outline" className="shrink-0 font-mono">
                        {autoText.keyword}
                      </Badge>
                      <p className="flex-1 text-muted-foreground line-clamp-2">
                        {autoText.text}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleInsertText(autoText.text)}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Diga "texto [palavra-chave]" para inserir automaticamente durante a gravação
              </p>
            </div>
          )}

          {/* Custom Commands */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Comandos Personalizados</h4>
            
            <ScrollArea className="h-40 rounded-md border p-2">
              <div className="space-y-2">
                {filteredCommands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum comando criado. Adicione comandos abaixo.
                  </p>
                ) : (
                  filteredCommands.map((command) => (
                    <div 
                      key={command.id}
                      className="flex items-start gap-3 p-2 bg-muted/30 rounded text-sm group"
                    >
                      <Badge variant="outline" className="shrink-0">
                        "{command.keyword}"
                      </Badge>
                      {command.templateId && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Template
                        </Badge>
                      )}
                      <p className="flex-1 text-muted-foreground line-clamp-2">
                        {command.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleTestCommand(command)}
                        >
                          <Zap className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteCommand(command.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add new command */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium">Criar Novo Comando</h4>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Palavra-chave (ex: conclusão normal)"
                    value={newCommand.keyword}
                    onChange={(e) => setNewCommand({ ...newCommand, keyword: e.target.value })}
                  />
                </div>
              </div>
              
              <Textarea
                placeholder="Texto a inserir quando o comando for reconhecido..."
                value={newCommand.text}
                onChange={(e) => setNewCommand({ ...newCommand, text: e.target.value })}
                rows={3}
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newCommand.templateSpecific}
                    onChange={(e) => setNewCommand({ ...newCommand, templateSpecific: e.target.checked })}
                    className="rounded"
                    disabled={!selectedTemplate}
                  />
                  <span className="text-muted-foreground">
                    Apenas para este template
                  </span>
                </label>
                
                <Button
                  onClick={handleAddCommand}
                  disabled={!newCommand.keyword.trim() || !newCommand.text.trim()}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Comando
                </Button>
              </div>
            </div>
          </div>

          {/* Usage instructions */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded">
            <p className="font-medium">Como usar:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Diga a palavra-chave durante a gravação para inserir o texto</li>
              <li>Para AutoTextos do template: "texto [keyword]"</li>
              <li>Para comandos personalizados: diga diretamente a palavra-chave</li>
              <li>Clique em <Zap className="w-3 h-3 inline" /> para testar a inserção</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
