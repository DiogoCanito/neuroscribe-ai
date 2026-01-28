import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Scan, Plus, Pencil, Trash2, Activity, Heart, Brain, Bone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTemplateStore } from '@/stores/templateStore';
import { useEditorStore } from '@/stores/editorStore';
import { TemplateModality, TemplateRegion, TemplateContent } from '@/types/templates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { TemplateEditDialog } from '@/components/TemplateEditDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface TemplateSidebarProps {
  onTemplateSelect: (template: TemplateContent) => void;
}

export function TemplateSidebar({ onTemplateSelect }: TemplateSidebarProps) {
  const [expandedModalities, setExpandedModalities] = useState<string[]>(['ressonancia']);
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);
  
  const { selectedTemplate } = useEditorStore();
  const { 
    templates, 
    addModality, 
    updateModality, 
    deleteModality,
    addRegion,
    updateRegion,
    deleteRegion,
    addTemplate,
    updateTemplate,
    deleteTemplate
  } = useTemplateStore();
  
  const { toast } = useToast();
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<'modality' | 'region' | 'template'>('modality');
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editData, setEditData] = useState<{ name?: string; icon?: string; baseText?: string }>({});
  const [editContext, setEditContext] = useState<{ modalityId?: string; regionId?: string; templateId?: string }>({});
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteContext, setDeleteContext] = useState<{ 
    type: 'modality' | 'region' | 'template';
    name: string;
    modalityId?: string;
    regionId?: string;
    templateId?: string;
  } | null>(null);

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

  // Add handlers
  const handleAddModality = () => {
    setEditType('modality');
    setEditMode('add');
    setEditData({});
    setEditContext({});
    setEditDialogOpen(true);
  };

  const handleAddRegion = (modalityId: string) => {
    setEditType('region');
    setEditMode('add');
    setEditData({});
    setEditContext({ modalityId });
    setEditDialogOpen(true);
  };

  const handleAddTemplate = (modalityId: string, regionId: string) => {
    setEditType('template');
    setEditMode('add');
    setEditData({});
    setEditContext({ modalityId, regionId });
    setEditDialogOpen(true);
  };

  // Edit handlers
  const handleEditModality = (modality: TemplateModality, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditType('modality');
    setEditMode('edit');
    setEditData({ name: modality.name, icon: modality.icon });
    setEditContext({ modalityId: modality.id });
    setEditDialogOpen(true);
  };

  const handleEditRegion = (modalityId: string, region: TemplateRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditType('region');
    setEditMode('edit');
    setEditData({ name: region.name });
    setEditContext({ modalityId, regionId: region.id });
    setEditDialogOpen(true);
  };

  const handleEditTemplate = (modalityId: string, regionId: string, template: TemplateContent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditType('template');
    setEditMode('edit');
    setEditData({ name: template.name, baseText: template.baseText });
    setEditContext({ modalityId, regionId, templateId: template.id });
    setEditDialogOpen(true);
  };

  // Delete handlers
  const handleDeleteModality = (modality: TemplateModality, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteContext({ type: 'modality', name: modality.name, modalityId: modality.id });
    setDeleteDialogOpen(true);
  };

  const handleDeleteRegion = (modalityId: string, region: TemplateRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteContext({ type: 'region', name: region.name, modalityId, regionId: region.id });
    setDeleteDialogOpen(true);
  };

  const handleDeleteTemplate = (modalityId: string, regionId: string, template: TemplateContent, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteContext({ type: 'template', name: template.name, modalityId, regionId, templateId: template.id });
    setDeleteDialogOpen(true);
  };

  // Save handler
  const handleSave = (data: { name: string; icon?: string; baseText?: string }) => {
    if (editMode === 'add') {
      switch (editType) {
        case 'modality':
          addModality({ name: data.name, icon: data.icon || 'Scan' });
          toast({ title: 'Modalidade adicionada', description: data.name });
          break;
        case 'region':
          if (editContext.modalityId) {
            addRegion(editContext.modalityId, { name: data.name });
            toast({ title: 'Região adicionada', description: data.name });
          }
          break;
        case 'template':
          if (editContext.modalityId && editContext.regionId) {
            addTemplate(editContext.modalityId, editContext.regionId, {
              name: data.name,
              baseText: data.baseText || '',
              autoTexts: [],
              keywordReplacements: []
            });
            toast({ title: 'Template adicionado', description: data.name });
          }
          break;
      }
    } else {
      switch (editType) {
        case 'modality':
          if (editContext.modalityId) {
            updateModality(editContext.modalityId, { name: data.name, icon: data.icon });
            toast({ title: 'Modalidade atualizada', description: data.name });
          }
          break;
        case 'region':
          if (editContext.modalityId && editContext.regionId) {
            updateRegion(editContext.modalityId, editContext.regionId, { name: data.name });
            toast({ title: 'Região atualizada', description: data.name });
          }
          break;
        case 'template':
          if (editContext.modalityId && editContext.regionId && editContext.templateId) {
            updateTemplate(editContext.modalityId, editContext.regionId, editContext.templateId, {
              name: data.name,
              baseText: data.baseText
            });
            toast({ title: 'Template atualizado', description: data.name });
          }
          break;
      }
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (!deleteContext) return;
    
    switch (deleteContext.type) {
      case 'modality':
        if (deleteContext.modalityId) {
          deleteModality(deleteContext.modalityId);
          toast({ title: 'Modalidade eliminada', description: deleteContext.name });
        }
        break;
      case 'region':
        if (deleteContext.modalityId && deleteContext.regionId) {
          deleteRegion(deleteContext.modalityId, deleteContext.regionId);
          toast({ title: 'Região eliminada', description: deleteContext.name });
        }
        break;
      case 'template':
        if (deleteContext.modalityId && deleteContext.regionId && deleteContext.templateId) {
          deleteTemplate(deleteContext.modalityId, deleteContext.regionId, deleteContext.templateId);
          toast({ title: 'Template eliminado', description: deleteContext.name });
        }
        break;
    }
    
    setDeleteDialogOpen(false);
    setDeleteContext(null);
  };

  const getModalityIcon = (iconName: string) => {
    const iconProps = { className: "w-3 h-3" };
    switch (iconName) {
      case 'Scan': return <Scan {...iconProps} />;
      case 'Activity': return <Activity {...iconProps} />;
      case 'Heart': return <Heart {...iconProps} />;
      case 'Brain': return <Brain {...iconProps} />;
      case 'Bone': return <Bone {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  return (
    <>
      <div className="w-48 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
        <div className="px-2 py-1.5 border-b border-sidebar-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-sidebar-foreground uppercase tracking-wide">Templates</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddModality}
            className="h-5 w-5 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            title="Adicionar Modalidade"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-1">
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
                onAddRegion={handleAddRegion}
                onAddTemplate={handleAddTemplate}
                onEditModality={handleEditModality}
                onEditRegion={handleEditRegion}
                onEditTemplate={handleEditTemplate}
                onDeleteModality={handleDeleteModality}
                onDeleteRegion={handleDeleteRegion}
                onDeleteTemplate={handleDeleteTemplate}
                getIcon={getModalityIcon}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <TemplateEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        type={editType}
        mode={editMode}
        initialData={editData}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar "{deleteContext?.name}"?
              {deleteContext?.type === 'modality' && ' Todas as regiões e templates associados serão também eliminados.'}
              {deleteContext?.type === 'region' && ' Todos os templates associados serão também eliminados.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  onAddRegion: (modalityId: string) => void;
  onAddTemplate: (modalityId: string, regionId: string) => void;
  onEditModality: (modality: TemplateModality, e: React.MouseEvent) => void;
  onEditRegion: (modalityId: string, region: TemplateRegion, e: React.MouseEvent) => void;
  onEditTemplate: (modalityId: string, regionId: string, template: TemplateContent, e: React.MouseEvent) => void;
  onDeleteModality: (modality: TemplateModality, e: React.MouseEvent) => void;
  onDeleteRegion: (modalityId: string, region: TemplateRegion, e: React.MouseEvent) => void;
  onDeleteTemplate: (modalityId: string, regionId: string, template: TemplateContent, e: React.MouseEvent) => void;
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
  onAddRegion,
  onAddTemplate,
  onEditModality,
  onEditRegion,
  onEditTemplate,
  onDeleteModality,
  onDeleteRegion,
  onDeleteTemplate,
  getIcon
}: ModalityItemProps) {
  return (
    <div className="mb-0.5 group/modality">
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-sidebar-foreground/60" />
          ) : (
            <ChevronRight className="w-3 h-3 text-sidebar-foreground/60" />
          )}
          {getIcon(modality.icon)}
          <span className="font-medium text-[11px]">{modality.name}</span>
        </button>
        <div className="opacity-0 group-hover/modality:opacity-100 flex items-center pr-1 transition-opacity">
          <button
            onClick={(e) => onEditModality(modality, e)}
            className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title="Editar"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => onAddRegion(modality.id)}
            className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title="Adicionar Região"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => onDeleteModality(modality, e)}
            className="p-0.5 rounded hover:bg-destructive/20 text-sidebar-foreground/50 hover:text-destructive"
            title="Eliminar"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="ml-3 mt-0.5">
          {modality.regions.map((region) => (
            <RegionItem
              key={region.id}
              modalityId={modality.id}
              region={region}
              isExpanded={expandedRegions.includes(region.id)}
              selectedTemplateId={selectedTemplateId}
              onToggle={() => onToggleRegion(region.id)}
              onTemplateClick={onTemplateClick}
              onAddTemplate={onAddTemplate}
              onEditRegion={onEditRegion}
              onEditTemplate={onEditTemplate}
              onDeleteRegion={onDeleteRegion}
              onDeleteTemplate={onDeleteTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RegionItemProps {
  modalityId: string;
  region: TemplateRegion;
  isExpanded: boolean;
  selectedTemplateId?: string;
  onToggle: () => void;
  onTemplateClick: (template: TemplateContent) => void;
  onAddTemplate: (modalityId: string, regionId: string) => void;
  onEditRegion: (modalityId: string, region: TemplateRegion, e: React.MouseEvent) => void;
  onEditTemplate: (modalityId: string, regionId: string, template: TemplateContent, e: React.MouseEvent) => void;
  onDeleteRegion: (modalityId: string, region: TemplateRegion, e: React.MouseEvent) => void;
  onDeleteTemplate: (modalityId: string, regionId: string, template: TemplateContent, e: React.MouseEvent) => void;
}

function RegionItem({
  modalityId,
  region,
  isExpanded,
  selectedTemplateId,
  onToggle,
  onTemplateClick,
  onAddTemplate,
  onEditRegion,
  onEditTemplate,
  onDeleteRegion,
  onDeleteTemplate
}: RegionItemProps) {
  return (
    <div className="mb-0.5 group/region">
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-1.5 px-2 py-0.5 rounded text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-2.5 h-2.5 text-sidebar-foreground/50" />
          ) : (
            <ChevronRight className="w-2.5 h-2.5 text-sidebar-foreground/50" />
          )}
          <span className="text-[11px]">{region.name}</span>
        </button>
        <div className="opacity-0 group-hover/region:opacity-100 flex items-center pr-1 transition-opacity">
          <button
            onClick={(e) => onEditRegion(modalityId, region, e)}
            className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title="Editar"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => onAddTemplate(modalityId, region.id)}
            className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title="Adicionar Template"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => onDeleteRegion(modalityId, region, e)}
            className="p-0.5 rounded hover:bg-destructive/20 text-sidebar-foreground/50 hover:text-destructive"
            title="Eliminar"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="ml-4 mt-0.5 space-y-0">
          {region.templates.map((template) => (
            <div key={template.id} className="flex items-center group/template">
              <button
                onClick={() => onTemplateClick(template)}
                className={cn(
                  "flex-1 flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors",
                  selectedTemplateId === template.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <FileText className="w-2.5 h-2.5" />
                <span className="truncate">{template.name}</span>
              </button>
              <div className="opacity-0 group-hover/template:opacity-100 flex items-center pr-1 transition-opacity">
                <button
                  onClick={(e) => onEditTemplate(modalityId, region.id, template, e)}
                  className="p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  title="Editar"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => onDeleteTemplate(modalityId, region.id, template, e)}
                  className="p-0.5 rounded hover:bg-destructive/20 text-sidebar-foreground/50 hover:text-destructive"
                  title="Eliminar"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

