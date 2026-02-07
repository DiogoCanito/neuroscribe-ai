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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { AutoText } from '@/types/templates';
import { cn } from '@/lib/utils';

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
    autoTexts?: AutoText[];
  };
  onSave: (data: { name: string; icon?: string; baseText?: string; voiceAlias?: string; autoTexts?: AutoText[] }) => void;
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
  const [autoTexts, setAutoTexts] = useState<AutoText[]>(initialData?.autoTexts || []);

  // New autotext form
  const [newKeyword, setNewKeyword] = useState('');
  const [newText, setNewText] = useState('');

  // Editing autotext
  const [editingAutoTextIndex, setEditingAutoTextIndex] = useState<number | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setIcon(initialData?.icon || 'Scan');
      setBaseText(initialData?.baseText || '');
      setVoiceAlias(initialData?.voiceAlias || '');
      setAutoTexts(initialData?.autoTexts || []);
      setNewKeyword('');
      setNewText('');
      setEditingAutoTextIndex(null);
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const data: { name: string; icon?: string; baseText?: string; voiceAlias?: string; autoTexts?: AutoText[] } = { name: name.trim() };
    
    if (type === 'modality') {
      data.icon = icon;
    }
    
    if (type === 'template') {
      data.baseText = baseText;
      data.voiceAlias = voiceAlias.trim() || undefined;
      data.autoTexts = autoTexts;
    }
    
    onSave(data);
    onOpenChange(false);
  };

  const handleAddAutoText = () => {
    if (!newKeyword.trim() || !newText.trim()) return;
    setAutoTexts(prev => [...prev, { keyword: newKeyword.trim(), text: newText.trim() }]);
    setNewKeyword('');
    setNewText('');
  };

  const handleDeleteAutoText = (index: number) => {
    setAutoTexts(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartEditAutoText = (index: number) => {
    setEditingAutoTextIndex(index);
    setEditKeyword(autoTexts[index].keyword);
    setEditText(autoTexts[index].text);
  };

  const handleSaveEditAutoText = () => {
    if (editingAutoTextIndex === null || !editKeyword.trim() || !editText.trim()) return;
    setAutoTexts(prev => prev.map((at, i) => 
      i === editingAutoTextIndex ? { keyword: editKeyword.trim(), text: editText.trim() } : at
    ));
    setEditingAutoTextIndex(null);
    setEditKeyword('');
    setEditText('');
  };

  const handleCancelEditAutoText = () => {
    setEditingAutoTextIndex(null);
    setEditKeyword('');
    setEditText('');
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

  // For modality/region, keep the narrow dialog
  const isTemplate = type === 'template';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        isTemplate ? "sm:max-w-[900px] max-h-[90vh] p-6 flex flex-col" : "sm:max-w-[500px] p-6"
      )}>
        <DialogHeader className="pb-1 shrink-0">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        {isTemplate ? (
          <TemplateEditContent
            name={name}
            setName={setName}
            voiceAlias={voiceAlias}
            setVoiceAlias={setVoiceAlias}
            baseText={baseText}
            setBaseText={setBaseText}
            autoTexts={autoTexts}
            newKeyword={newKeyword}
            setNewKeyword={setNewKeyword}
            newText={newText}
            setNewText={setNewText}
            editingAutoTextIndex={editingAutoTextIndex}
            editKeyword={editKeyword}
            setEditKeyword={setEditKeyword}
            editText={editText}
            setEditText={setEditText}
            onAddAutoText={handleAddAutoText}
            onDeleteAutoText={handleDeleteAutoText}
            onStartEditAutoText={handleStartEditAutoText}
            onSaveEditAutoText={handleSaveEditAutoText}
            onCancelEditAutoText={handleCancelEditAutoText}
            placeholder={getPlaceholder()!}
          />
        ) : (
          <SimpleEditContent
            type={type}
            name={name}
            setName={setName}
            icon={icon}
            setIcon={setIcon}
            placeholder={getPlaceholder()!}
          />
        )}
        
        <DialogFooter className="pt-3 border-t border-border shrink-0">
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

// Simple content for modality/region
function SimpleEditContent({
  type,
  name,
  setName,
  icon,
  setIcon,
  placeholder,
}: {
  type: 'modality' | 'region';
  name: string;
  setName: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
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
    </div>
  );
}

// Full two-column content for template editing
function TemplateEditContent({
  name,
  setName,
  voiceAlias,
  setVoiceAlias,
  baseText,
  setBaseText,
  autoTexts,
  newKeyword,
  setNewKeyword,
  newText,
  setNewText,
  editingAutoTextIndex,
  editKeyword,
  setEditKeyword,
  editText,
  setEditText,
  onAddAutoText,
  onDeleteAutoText,
  onStartEditAutoText,
  onSaveEditAutoText,
  onCancelEditAutoText,
  placeholder,
}: {
  name: string;
  setName: (v: string) => void;
  voiceAlias: string;
  setVoiceAlias: (v: string) => void;
  baseText: string;
  setBaseText: (v: string) => void;
  autoTexts: AutoText[];
  newKeyword: string;
  setNewKeyword: (v: string) => void;
  newText: string;
  setNewText: (v: string) => void;
  editingAutoTextIndex: number | null;
  editKeyword: string;
  setEditKeyword: (v: string) => void;
  editText: string;
  setEditText: (v: string) => void;
  onAddAutoText: () => void;
  onDeleteAutoText: (index: number) => void;
  onStartEditAutoText: (index: number) => void;
  onSaveEditAutoText: () => void;
  onCancelEditAutoText: () => void;
  placeholder: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 pb-1 min-h-0 flex-1 overflow-hidden">
      {/* Left column: Template config */}
      <div className="flex flex-col min-h-0 overflow-hidden pr-2">
        {/* Fixed fields - always visible */}
        <div className="space-y-3 shrink-0 pb-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome da Template</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="voiceAlias">Comando de Voz (opcional)</Label>
            <Input
              id="voiceAlias"
              value={voiceAlias}
              onChange={(e) => setVoiceAlias(e.target.value)}
              placeholder="Ex: RM ME, crânio simples..."
            />
            <p className="text-xs text-muted-foreground">
              Diga este comando para selecionar o template por voz.
            </p>
          </div>
        </div>
        
        {/* Text Base - fills remaining space, single scroll here */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Label className="shrink-0 mb-1.5">Texto Base do Relatório</Label>
          <div className="flex-1 min-h-0 overflow-auto rounded-md">
            <TemplateRichTextEditor
              value={baseText}
              onChange={setBaseText}
              placeholder="Insira o texto base do template..."
            />
          </div>
        </div>
      </div>

      {/* Right column: AutoTexts */}
      <div className="flex flex-col min-h-0 overflow-hidden border-l border-border pl-8">
        <div className="mb-3">
          <Label className="text-sm font-semibold">Textos Automáticos da Template</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Frases rápidas específicas para esta template. Aparecem na barra lateral durante o relato.
          </p>
        </div>

        {/* Add new autotext */}
        <div className="space-y-2 mb-4 p-3 rounded-md border border-dashed border-border bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-xs">Palavra-chave</Label>
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Ex: protusão posterior"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Texto clínico</Label>
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Ex: Protusão discal posterior, sem repercussão..."
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddAutoText();
                }
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={onAddAutoText}
            disabled={!newKeyword.trim() || !newText.trim()}
            className="gap-1.5 h-7 text-xs"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
        </div>

        {/* List of autotexts */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 pr-3">
            {autoTexts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sem textos automáticos. Adicione frases clínicas rápidas para esta template.
              </p>
            ) : (
              autoTexts.map((at, index) => (
                <div key={index}>
                  {editingAutoTextIndex === index ? (
                    <div className="p-2 rounded-md border border-primary/30 bg-primary/5 space-y-1.5">
                      <Input
                        value={editKeyword}
                        onChange={(e) => setEditKeyword(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Palavra-chave"
                        autoFocus
                      />
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Texto clínico"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={onSaveEditAutoText} className="h-6 text-xs gap-1 px-2">
                          <Check className="w-3 h-3" /> Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onCancelEditAutoText} className="h-6 text-xs gap-1 px-2">
                          <X className="w-3 h-3" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 group transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{at.keyword}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{at.text}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStartEditAutoText(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteAutoText(index)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
