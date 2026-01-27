import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { templates } from '@/data/templates';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateModality, TemplateRegion, TemplateContent } from '@/types/templates';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateSidebarProps {
  onTemplateSelect: (template: TemplateContent) => void;
}

export function TemplateSidebar({ onTemplateSelect }: TemplateSidebarProps) {
  const [expandedModalities, setExpandedModalities] = useState<string[]>(['ressonancia']);
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);
  
  const { selectedTemplate } = useEditorStore();

  const toggleModality = (modalityId: string) => {
    setExpandedModalities(prev =>
      prev.includes(modalityId)
        ? prev.filter(id => id !== modalityId)
        : [...prev, modalityId]
    );
  };

  const toggleRegion = (regionId: string) => {
    setExpandedRegions(prev =>
      prev.includes(regionId)
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId]
    );
  };

  const handleTemplateClick = (template: TemplateContent) => {
    onTemplateSelect(template);
  };

  const getModalityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scan':
        return <Scan className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-72 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Templates</h2>
        <p className="text-xs text-sidebar-foreground/60 mt-1">
          Selecione um template para começar
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {templates.map((modality) => (
            <ModalityItem
              key={modality.id}
              modality={modality}
              isExpanded={expandedModalities.includes(modality.id)}
              expandedRegions={expandedRegions}
              selectedTemplateId={selectedTemplate?.id}
              onToggle={() => toggleModality(modality.id)}
              onToggleRegion={toggleRegion}
              onTemplateClick={handleTemplateClick}
              getIcon={getModalityIcon}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ModalityItemProps {
  modality: TemplateModality;
  isExpanded: boolean;
  expandedRegions: string[];
  selectedTemplateId?: string;
  onToggle: () => void;
  onToggleRegion: (regionId: string) => void;
  onTemplateClick: (template: TemplateContent) => void;
  getIcon: (iconName: string) => React.ReactNode;
}

function ModalityItem({
  modality,
  isExpanded,
  expandedRegions,
  selectedTemplateId,
  onToggle,
  onToggleRegion,
  onTemplateClick,
  getIcon
}: ModalityItemProps) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
        ) : (
          <ChevronRight className="w-4 h-4 text-sidebar-foreground/60" />
        )}
        {getIcon(modality.icon)}
        <span className="font-medium text-sm">{modality.name}</span>
      </button>
      
      {isExpanded && (
        <div className="ml-4 mt-1">
          {modality.regions.map((region) => (
            <RegionItem
              key={region.id}
              region={region}
              isExpanded={expandedRegions.includes(region.id)}
              selectedTemplateId={selectedTemplateId}
              onToggle={() => onToggleRegion(region.id)}
              onTemplateClick={onTemplateClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RegionItemProps {
  region: TemplateRegion;
  isExpanded: boolean;
  selectedTemplateId?: string;
  onToggle: () => void;
  onTemplateClick: (template: TemplateContent) => void;
}

function RegionItem({
  region,
  isExpanded,
  selectedTemplateId,
  onToggle,
  onTemplateClick
}: RegionItemProps) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-sidebar-foreground/50" />
        ) : (
          <ChevronRight className="w-3 h-3 text-sidebar-foreground/50" />
        )}
        <span className="text-sm">{region.name}</span>
      </button>
      
      {isExpanded && (
        <div className="ml-5 mt-1 space-y-0.5">
          {region.templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onTemplateClick(template)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                selectedTemplateId === template.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <FileText className="w-3 h-3" />
              <span className="truncate">{template.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
