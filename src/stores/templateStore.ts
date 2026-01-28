import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateContent, TemplateModality, TemplateRegion } from '@/types/templates';
import { templates as defaultTemplates } from '@/data/templates';
import { supabase } from '@/integrations/supabase/client';

interface TemplateStore {
  templates: TemplateModality[];
  isLoading: boolean;
  isInitialized: boolean;
  userId: string | null;
  
  // Init action
  initializeForUser: (userId: string | null) => Promise<void>;
  
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

// Helper to save to database
const saveToDatabase = async (userId: string, templates: TemplateModality[]) => {
  try {
    // First check if record exists
    const { data: existing } = await supabase
      .from('user_templates')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Use JSON.parse/stringify to ensure proper JSON format
    const templatesJson = JSON.parse(JSON.stringify(templates));
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('user_templates')
        .update({ templates_data: templatesJson })
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating templates in database:', error);
      }
    } else {
      // Insert new record with type assertion to bypass strict typing
      const insertData = { user_id: userId, templates_data: templatesJson };
      const { error } = await (supabase
        .from('user_templates') as ReturnType<typeof supabase.from>)
        .insert(insertData);
      
      if (error) {
        console.error('Error inserting templates in database:', error);
      }
    }
  } catch (err) {
    console.error('Error saving templates:', err);
  }
};

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      isLoading: false,
      isInitialized: false,
      userId: null,
      
      initializeForUser: async (userId: string | null) => {
        if (!userId) {
          // Not logged in, use localStorage defaults
          set({ isInitialized: true, userId: null });
          return;
        }
        
        set({ isLoading: true, userId });
        
        try {
          // Try to load from database
          const { data, error } = await supabase
            .from('user_templates')
            .select('templates_data')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (error) {
            console.error('Error loading templates from database:', error);
            set({ isLoading: false, isInitialized: true });
            return;
          }
          
          if (data?.templates_data) {
            // User has saved templates in database
            set({ 
              templates: data.templates_data as unknown as TemplateModality[],
              isLoading: false,
              isInitialized: true 
            });
          } else {
            // No saved templates, save current localStorage templates to database
            const currentTemplates = get().templates;
            await saveToDatabase(userId, currentTemplates);
            set({ isLoading: false, isInitialized: true });
          }
        } catch (err) {
          console.error('Error initializing templates:', err);
          set({ isLoading: false, isInitialized: true });
        }
      },
      
      // Modality actions
      addModality: (modality) => {
        const newModality: TemplateModality = {
          ...modality,
          id: `modality-${Date.now()}`,
          regions: []
        };
        set((state) => {
          const newTemplates = [...state.templates, newModality];
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      updateModality: (id, updates) => {
        set((state) => {
          const newTemplates = state.templates.map(m => 
            m.id === id ? { ...m, ...updates } : m
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      deleteModality: (id) => {
        set((state) => {
          const newTemplates = state.templates.filter(m => m.id !== id);
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      // Region actions
      addRegion: (modalityId, region) => {
        const newRegion: TemplateRegion = {
          ...region,
          id: `region-${Date.now()}`,
          templates: []
        };
        set((state) => {
          const newTemplates = state.templates.map(m => 
            m.id === modalityId 
              ? { ...m, regions: [...m.regions, newRegion] }
              : m
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      updateRegion: (modalityId, regionId, updates) => {
        set((state) => {
          const newTemplates = state.templates.map(m => 
            m.id === modalityId 
              ? {
                  ...m,
                  regions: m.regions.map(r => 
                    r.id === regionId ? { ...r, ...updates } : r
                  )
                }
              : m
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      deleteRegion: (modalityId, regionId) => {
        set((state) => {
          const newTemplates = state.templates.map(m => 
            m.id === modalityId 
              ? { ...m, regions: m.regions.filter(r => r.id !== regionId) }
              : m
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      // Template actions
      addTemplate: (modalityId, regionId, template) => {
        const newTemplate: TemplateContent = {
          ...template,
          id: `template-${Date.now()}`
        };
        set((state) => {
          const newTemplates = state.templates.map(m => 
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
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      updateTemplate: (modalityId, regionId, templateId, updates) => {
        set((state) => {
          const newTemplates = state.templates.map(m => 
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
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      deleteTemplate: (modalityId, regionId, templateId) => {
        set((state) => {
          const newTemplates = state.templates.map(m => 
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
          );
          if (state.userId) {
            saveToDatabase(state.userId, newTemplates);
          }
          return { templates: newTemplates };
        });
      },
      
      resetToDefaults: () => {
        set((state) => {
          if (state.userId) {
            saveToDatabase(state.userId, defaultTemplates);
          }
          return { templates: defaultTemplates };
        });
      }
    }),
    {
      name: 'medreport-templates-storage'
    }
  )
);
