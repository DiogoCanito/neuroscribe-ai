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
  const lastRawValue = useRef<string>('');
  const isInternalChange = useRef<boolean>(false);

  // Convert plain text/markdown with newlines to HTML
  const textToHtml = (text: string) => {
    if (!text) return '';
    // If already HTML, return as-is
    if (text.includes('<') && text.includes('>')) return text;
    
    // Convert markdown bold (**text**) to HTML
    let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert plain text newlines to HTML
    html = html
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
    
    return html;
  };

  // Sync external value changes - update editor when value changes from outside
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      // Compare raw values to detect actual changes
      if (value !== lastRawValue.current) {
        console.log('[RichTextEditor] Updating with new value:', value?.substring(0, 100));
        lastRawValue.current = value;
        const htmlValue = textToHtml(value);
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
      const newValue = editorRef.current.innerHTML;
      isInternalChange.current = true;
      lastRawValue.current = newValue;
      onChange(newValue);
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
      className="h-6 w-6 p-0"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );

  const Separator = () => (
    <div className="h-4 w-px bg-border mx-0.5" />
  );

  return (
    <div className={cn("flex flex-col h-full border rounded-md bg-background", className)}>
      {/* Compact Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => execCommand('undo')} title="Desfazer (Ctrl+Z)">
          <Undo className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('redo')} title="Refazer (Ctrl+Y)">
          <Redo className="w-3 h-3" />
        </ToolbarButton>

        <Separator />

        {/* Font Family */}
        <Select
          disabled={disabled}
          onValueChange={(font) => execCommand('fontName', font)}
          defaultValue="Arial"
        >
          <SelectTrigger className="h-6 w-24 text-[10px]">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem 
                key={font.value} 
                value={font.value}
                style={{ fontFamily: font.value }}
                className="text-xs"
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
          <SelectTrigger className="h-6 w-14 text-[10px]">
            <SelectValue placeholder="Tam" />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size.value} value={size.value} className="text-xs">
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator />

        {/* Text Formatting */}
        <ToolbarButton onClick={() => execCommand('bold')} title="Negrito (Ctrl+B)">
          <Bold className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Itálico (Ctrl+I)">
          <Italic className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Sublinhado (Ctrl+U)">
          <Underline className="w-3 h-3" />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Alinhar à esquerda">
          <AlignLeft className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Centrar">
          <AlignCenter className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Alinhar à direita">
          <AlignRight className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyFull')} title="Justificar">
          <AlignJustify className="w-3 h-3" />
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Lista com marcas">
          <List className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Lista numerada">
          <ListOrdered className="w-3 h-3" />
        </ToolbarButton>
      </div>

      {/* Editor - More compact text */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex-1 p-2 overflow-auto text-[11px] leading-relaxed outline-none",
          "focus:ring-0",
          disabled && "opacity-50 cursor-not-allowed",
          !value && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none"
        )}
        data-placeholder={placeholder}
        style={{ minHeight: '150px' }}
        suppressContentEditableWarning
      />
    </div>
  );
}
