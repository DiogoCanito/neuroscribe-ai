import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemplateRichTextEditor } from './TemplateRichTextEditor';

type EditType = 'modality' | 'region' | 'template';
type EditMode = 'add' | 'edit';

interface TemplateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EditType;
  mode: EditMode;
  initialData?: {
    name?: string;
    icon?: string;
    baseText?: string;
    voiceAlias?: string;
  };
  onSave: (data: { name: string; icon?: string; baseText?: string; voiceAlias?: string }) => void;
}

const iconOptions = [
  { value: 'Scan', label: 'Scan (Ressonância)' },
  { value: 'FileText', label: 'Documento' },
  { value: 'Activity', label: 'Atividade' },
  { value: 'Heart', label: 'Coração' },
  { value: 'Brain', label: 'Cérebro' },
  { value: 'Bone', label: 'Osso' },
];

export function TemplateEditDialog({
  open,
  onOpenChange,
  type,
  mode,
  initialData,
  onSave
}: TemplateEditDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [icon, setIcon] = useState(initialData?.icon || 'Scan');
  const [baseText, setBaseText] = useState(initialData?.baseText || '');
  const [voiceAlias, setVoiceAlias] = useState(initialData?.voiceAlias || '');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || 'Scan');
      setBaseText(initialData?.baseText || '');
      setVoiceAlias(initialData?.voiceAlias || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const data: { name: string; icon?: string; baseText?: string; voiceAlias?: string } = { name: name.trim() };
    
    if (type === 'modality') {
      data.icon = icon;
    }
    
    if (type === 'template') {
      data.baseText = baseText;
      data.voiceAlias = voiceAlias.trim() || undefined;
    }
    
    onSave(data);
    onOpenChange(false);
  };

  const getTitle = () => {
    const action = mode === 'add' ? 'Adicionar' : 'Editar';
    switch (type) {
      case 'modality': return `${action} Modalidade`;
      case 'region': return `${action} Região`;
      case 'template': return `${action} Template`;
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'modality': return 'Ex: Tomografia Computorizada';
      case 'region': return 'Ex: Tórax';
      case 'template': return 'Ex: TC Tórax Alta Resolução';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={getPlaceholder()}
            />
          </div>
          
          {type === 'modality' && (
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {type === 'template' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="voiceAlias">Comando de Voz (opcional)</Label>
                <Input
                  id="voiceAlias"
                  value={voiceAlias}
                  onChange={(e) => setVoiceAlias(e.target.value)}
                  placeholder="Ex: RM ME, crânio simples..."
                />
                <p className="text-xs text-muted-foreground">
                  Diga este comando para selecionar o template por voz. Se vazio, usa o nome.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Texto Base do Relatório</Label>
                <TemplateRichTextEditor
                  value={baseText}
                  onChange={setBaseText}
                  placeholder="Insira o texto base do template..."
                />
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {mode === 'add' ? 'Adicionar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
