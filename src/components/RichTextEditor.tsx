import { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const fontFamilies = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const fontSizes = [
  { value: '1', label: '8pt' },
  { value: '2', label: '10pt' },
  { value: '3', label: '12pt' },
  { value: '4', label: '14pt' },
  { value: '5', label: '18pt' },
  { value: '6', label: '24pt' },
  { value: '7', label: '36pt' },
];

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  disabled,
  className 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Convert plain text with newlines to HTML
  const textToHtml = (text: string) => {
    if (!text) return '';
    // If already HTML, return as-is
    if (text.includes('<') && text.includes('>')) return text;
    // Convert plain text newlines to HTML
    return text
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
  };

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const htmlValue = textToHtml(value);
      if (editorRef.current.innerHTML !== htmlValue) {
        editorRef.current.innerHTML = htmlValue;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          execCommand('undo');
          break;
        case 'y':
          e.preventDefault();
          execCommand('redo');
          break;
      }
    }
  }, [execCommand]);

  const ToolbarButton = ({ 
    onClick, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    children: React.ReactNode; 
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );

  const Separator = () => (
    <div className="h-5 w-px bg-border mx-1" />
  );

  return (
    <div className={cn("flex flex-col h-full border rounded-md bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1.5 border-b bg-muted/30 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => execCommand('undo')} title="Desfazer (Ctrl+Z)">
          <Undo className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('redo')} title="Refazer (Ctrl+Y)">
          <Redo className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Separator />

        {/* Font Family */}
        <Select
          disabled={disabled}
          onValueChange={(font) => execCommand('fontName', font)}
          defaultValue="Arial"
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem 
                key={font.value} 
                value={font.value}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          disabled={disabled}
          onValueChange={(size) => execCommand('fontSize', size)}
          defaultValue="3"
        >
          <SelectTrigger className="h-7 w-16 text-xs">
            <SelectValue placeholder="Tamanho" />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator />

        {/* Text Formatting */}
        <ToolbarButton onClick={() => execCommand('bold')} title="Negrito (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Itálico (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Sublinhado (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Alinhar à esquerda">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Centrar">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Alinhar à direita">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyFull')} title="Justificar">
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Lista com marcas">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Lista numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex-1 p-3 overflow-auto text-sm leading-relaxed outline-none",
          "focus:ring-0",
          disabled && "opacity-50 cursor-not-allowed",
          !value && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none"
        )}
        data-placeholder={placeholder}
        style={{ minHeight: '200px' }}
        suppressContentEditableWarning
      />
    </div>
  );
}
