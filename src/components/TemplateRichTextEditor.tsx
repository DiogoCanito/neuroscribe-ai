import { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TemplateRichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  className 
}: TemplateRichTextEditorProps) {
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

  const execCommand = useCallback((command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
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
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("flex flex-col border rounded-md bg-background", className)}>
      {/* Compact Toolbar */}
      <div className="flex items-center gap-1 p-1.5 border-b bg-muted/30">
        <ToolbarButton onClick={() => execCommand('bold')} title="Negrito (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Itálico (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Sublinhado (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={cn(
          "p-3 overflow-auto text-sm leading-relaxed outline-none",
          "focus:ring-0 min-h-[200px] max-h-[300px]",
          !value && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none"
        )}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
