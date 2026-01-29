// Template hierarchy: Modality > Region > Specific Template

export interface AutoText {
  keyword: string;
  text: string;
}

export interface KeywordReplacement {
  from: string;
  to: string;
}

export interface TemplateContent {
  id: string;
  name: string;
  voiceAlias?: string; // Custom voice command to select this template (e.g., "RM ME")
  baseText: string;
  autoTexts: AutoText[];
  keywordReplacements: KeywordReplacement[];
}

export interface TemplateRegion {
  id: string;
  name: string;
  templates: TemplateContent[];
}

export interface TemplateModality {
  id: string;
  name: string;
  icon: string;
  regions: TemplateRegion[];
}

export interface FrequentTerm {
  id: string;
  term: string;
  category?: string;
}
