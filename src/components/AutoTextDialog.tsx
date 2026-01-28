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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  Plus, 
  Trash2,
  Zap,
  MessageSquare
} from 'lucide-react';

export function AutoTextDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newCommand, setNewCommand] = useState({ keyword: '', text: '' });
  
  const { 
    reportContent,
    setReportContent,
    voiceCommands,
    addVoiceCommand,
    deleteVoiceCommand,
  } = useEditorStore();

  const handleAddCommand = () => {
    if (!newCommand.keyword.trim() || !newCommand.text.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha a palavra-chave e o texto"
      });
      return;
    }

    addVoiceCommand({
      keyword: newCommand.keyword.toLowerCase().trim(),
      text: newCommand.text.trim()
    });
    
    setNewCommand({ keyword: '', text: '' });
    toast({
      title: "Comando criado",
      description: `Diga "${newCommand.keyword}" para inserir o texto`
    });
  };

  const handleInsertText = (text: string) => {
    setReportContent(reportContent + ' ' + text);
    toast({ title: "Texto inserido" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-6 text-[11px] px-2">
          <MessageSquare className="w-3 h-3" />
          Auto
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
          {/* Commands list */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">Comandos Globais</h4>
              <p className="text-xs text-muted-foreground">
                Comandos guardados que funcionam em todos os templates. Clique para inserir.
              </p>
            </div>
            
            <ScrollArea className="h-48 rounded-md border p-2">
              <div className="space-y-2">
                {voiceCommands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum comando criado. Adicione abaixo.
                  </p>
                ) : (
                  voiceCommands.map((command) => (
                    <div 
                      key={command.id}
                      className="flex items-start gap-3 p-2 bg-muted/30 rounded text-sm group"
                    >
                      <Badge variant="outline" className="shrink-0">
                        "{command.keyword}"
                      </Badge>
                      <p className="flex-1 text-muted-foreground line-clamp-2">
                        {command.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleInsertText(command.text)}
                        >
                          <Zap className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            deleteVoiceCommand(command.id);
                            toast({ title: "Comando removido" });
                          }}
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
            
            <Input
              placeholder="Palavra-chave (ex: conclusão normal)"
              value={newCommand.keyword}
              onChange={(e) => setNewCommand({ ...newCommand, keyword: e.target.value })}
            />
            
            <Textarea
              placeholder="Texto a inserir quando o comando for reconhecido..."
              value={newCommand.text}
              onChange={(e) => setNewCommand({ ...newCommand, text: e.target.value })}
              rows={3}
            />
            
            <Button
              onClick={handleAddCommand}
              disabled={!newCommand.keyword.trim() || !newCommand.text.trim()}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Comando
            </Button>
          </div>

          {/* Usage instructions */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded">
            <p className="font-medium">Como usar:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Diga a palavra-chave durante a gravação para inserir o texto</li>
              <li>Clique em <Zap className="w-3 h-3 inline" /> para inserir manualmente</li>
              <li>Os comandos são guardados e funcionam em todos os templates</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
