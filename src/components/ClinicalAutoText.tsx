import { useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FileText, Zap } from 'lucide-react';

// Clinical auto-text snippets organized by category
const clinicalAutoTexts = [
  // Normal findings
  { id: '1', text: 'Sem alterações significativas.', category: 'Normal' },
  { id: '2', text: 'Morfologia e sinal normais.', category: 'Normal' },
  { id: '3', text: 'Exame sem alterações relevantes.', category: 'Normal' },
  { id: '4', text: 'Achados de características normais.', category: 'Normal' },
  
  // Technique
  { id: '5', text: 'Estudo realizado em equipamento de 1.5T.', category: 'Técnica' },
  { id: '6', text: 'Estudo realizado em equipamento de 3T.', category: 'Técnica' },
  { id: '7', text: 'Com administração de contraste endovenoso.', category: 'Técnica' },
  { id: '8', text: 'Sem administração de contraste.', category: 'Técnica' },
  
  // Spine
  { id: '9', text: 'Mantido o alinhamento fisiológico.', category: 'Coluna' },
  { id: '10', text: 'Protrusão discal posterior mediana.', category: 'Coluna' },
  { id: '11', text: 'Hérnia discal extruída.', category: 'Coluna' },
  { id: '12', text: 'Canal vertebral com calibre normal.', category: 'Coluna' },
  { id: '13', text: 'Estenose foraminal.', category: 'Coluna' },
  { id: '14', text: 'Alterações degenerativas discais.', category: 'Coluna' },
  
  // Joints
  { id: '15', text: 'Sem evidência de derrame articular.', category: 'Articulação' },
  { id: '16', text: 'Derrame articular de pequeno volume.', category: 'Articulação' },
  { id: '17', text: 'Cartilagem articular de espessura conservada.', category: 'Articulação' },
  { id: '18', text: 'Sinovite ligeira.', category: 'Articulação' },
  
  // Tendons
  { id: '19', text: 'Tendões íntegros, de morfologia e sinal normais.', category: 'Tendão' },
  { id: '20', text: 'Tendinopatia com espessamento do tendão.', category: 'Tendão' },
  { id: '21', text: 'Rotura parcial do tendão.', category: 'Tendão' },
  { id: '22', text: 'Rotura completa do tendão.', category: 'Tendão' },
  
  // Menisci
  { id: '23', text: 'Meniscos de morfologia e sinal normais.', category: 'Menisco' },
  { id: '24', text: 'Lesão degenerativa meniscal.', category: 'Menisco' },
  { id: '25', text: 'Rotura meniscal complexa.', category: 'Menisco' },
  
  // Ligaments
  { id: '26', text: 'Ligamentos cruzados íntegros.', category: 'Ligamento' },
  { id: '27', text: 'Rotura do ligamento cruzado anterior.', category: 'Ligamento' },
  { id: '28', text: 'Ligamentos colaterais sem alterações.', category: 'Ligamento' },
  
  // Brain
  { id: '29', text: 'Parênquima encefálico sem alterações focais.', category: 'Crânio' },
  { id: '30', text: 'Sistema ventricular de dimensões normais.', category: 'Crânio' },
  { id: '31', text: 'Sem evidência de restrição à difusão.', category: 'Crânio' },
  { id: '32', text: 'Estruturas da linha média centradas.', category: 'Crânio' },
  
  // Conclusion
  { id: '33', text: 'Estudo sem alterações patológicas significativas.', category: 'Conclusão' },
  { id: '34', text: 'Correlação clínica aconselhada.', category: 'Conclusão' },
  { id: '35', text: 'Recomenda-se seguimento imagiológico.', category: 'Conclusão' },
];

export function ClinicalAutoText() {
  const { toast } = useToast();
  const { reportContent, setReportContent, selectedTemplate } = useEditorStore();

  const handleInsertText = useCallback((text: string) => {
    if (!selectedTemplate) {
      toast({
        variant: "destructive",
        title: "Sem template",
        description: "Selecione um template primeiro."
      });
      return;
    }

    // Insert text at cursor position or at the end
    const newContent = reportContent ? reportContent + ' ' + text : text;
    setReportContent(newContent);
    
    toast({
      title: "Texto inserido",
      description: text.substring(0, 30) + (text.length > 30 ? '...' : '')
    });
  }, [reportContent, setReportContent, selectedTemplate, toast]);

  // Group auto-texts by category
  const textsByCategory = clinicalAutoTexts.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof clinicalAutoTexts>);

  return (
    <div className="w-44 h-full bg-muted/20 flex flex-col border-l border-border">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">AutoTexto Clínico</span>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-2">
          {Object.entries(textsByCategory).map(([category, items]) => (
            <div key={category}>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-1.5 mb-0.5">
                {category}
              </p>
              <div className="space-y-0">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleInsertText(item.text)}
                    disabled={!selectedTemplate}
                    className={cn(
                      "w-full text-left px-1.5 py-0.5 text-[10px] rounded transition-colors leading-tight",
                      selectedTemplate 
                        ? "hover:bg-accent/50 cursor-pointer" 
                        : "opacity-50 cursor-not-allowed"
                    )}
                    title={item.text}
                  >
                    {item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
