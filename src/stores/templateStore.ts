import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateContent, TemplateModality, TemplateRegion } from '@/types/templates';
import { templates as defaultTemplates } from '@/data/templates';

interface TemplateStore {
  templates: TemplateModality[];
  
  // Modality actions
  addModality: (modality: Omit<TemplateModality, 'id' | 'regions'>) => void;
  updateModality: (id: string, updates: Partial<Omit<TemplateModality, 'id' | 'regions'>>) => void;
  deleteModality: (id: string) => void;
  
  // Region actions
  addRegion: (modalityId: string, region: Omit<TemplateRegion, 'id' | 'templates'>) => void;
  updateRegion: (modalityId: string, regionId: string, updates: Partial<Omit<TemplateRegion, 'id' | 'templates'>>) => void;
  deleteRegion: (modalityId: string, regionId: string) => void;
  
  // Template actions
  addTemplate: (modalityId: string, regionId: string, template: Omit<TemplateContent, 'id'>) => void;
  updateTemplate: (modalityId: string, regionId: string, templateId: string, updates: Partial<Omit<TemplateContent, 'id'>>) => void;
  deleteTemplate: (modalityId: string, regionId: string, templateId: string) => void;
  
  // Reset to defaults
  resetToDefaults: () => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      
      // Modality actions
      addModality: (modality) => {
        const newModality: TemplateModality = {
          ...modality,
          id: `modality-${Date.now()}`,
          regions: []
        };
        set((state) => ({
          templates: [...state.templates, newModality]
        }));
      },
      
      updateModality: (id, updates) => {
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === id ? { ...m, ...updates } : m
          )
        }));
      },
      
      deleteModality: (id) => {
        set((state) => ({
          templates: state.templates.filter(m => m.id !== id)
        }));
      },
      
      // Region actions
      addRegion: (modalityId, region) => {
        const newRegion: TemplateRegion = {
          ...region,
          id: `region-${Date.now()}`,
          templates: []
        };
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === modalityId 
              ? { ...m, regions: [...m.regions, newRegion] }
              : m
          )
        }));
      },
      
      updateRegion: (modalityId, regionId, updates) => {
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === modalityId 
              ? {
                  ...m,
                  regions: m.regions.map(r => 
                    r.id === regionId ? { ...r, ...updates } : r
                  )
                }
              : m
          )
        }));
      },
      
      deleteRegion: (modalityId, regionId) => {
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === modalityId 
              ? { ...m, regions: m.regions.filter(r => r.id !== regionId) }
              : m
          )
        }));
      },
      
      // Template actions
      addTemplate: (modalityId, regionId, template) => {
        const newTemplate: TemplateContent = {
          ...template,
          id: `template-${Date.now()}`
        };
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === modalityId 
              ? {
                  ...m,
                  regions: m.regions.map(r => 
                    r.id === regionId 
                      ? { ...r, templates: [...r.templates, newTemplate] }
                      : r
                  )
                }
              : m
          )
        }));
      },
      
      updateTemplate: (modalityId, regionId, templateId, updates) => {
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === modalityId 
              ? {
                  ...m,
                  regions: m.regions.map(r => 
                    r.id === regionId 
                      ? {
                          ...r,
                          templates: r.templates.map(t => 
                            t.id === templateId ? { ...t, ...updates } : t
                          )
                        }
                      : r
                  )
                }
              : m
          )
        }));
      },
      
      deleteTemplate: (modalityId, regionId, templateId) => {
        set((state) => ({
          templates: state.templates.map(m => 
            m.id === modalityId 
              ? {
                  ...m,
                  regions: m.regions.map(r => 
                    r.id === regionId 
                      ? { ...r, templates: r.templates.filter(t => t.id !== templateId) }
                      : r
                  )
                }
              : m
          )
        }));
      },
      
      resetToDefaults: () => {
        set({ templates: defaultTemplates });
      }
    }),
    {
      name: 'medreport-templates-storage'
    }
  )
);
