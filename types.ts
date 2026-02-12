
export enum View {
  DASHBOARD = 'DASHBOARD',
  BRAND_LIBRARY = 'BRAND_LIBRARY',
  STRATEGY_EDITOR = 'STRATEGY_EDITOR',
  GENERATOR = 'GENERATOR',
  GROWTH_LOG = 'GROWTH_LOG'
}

export interface BrandInfo {
  id?: string;
  name: string;
  productDescription: string;
  targetAudience: string;
  brandTone: string;
}

export interface CompetitorPattern {
  id: string;
  name: string;
  description: string;
  account_name?: string;
  category?: string;
  slides: {
    order: number;
    purpose: string; // e.g., "Hook with numbers", "Empathy"
    visualGuidance: string;
  }[];
  skeleton?: {
    template_name: string;
    category: string;
    total_slides: number;
    skeleton: Array<{
      slide_number: number;
      role: string;
      recommended_elements: string[];
      copy_pattern: string;
      visual_instruction: string;
    }>;
    summary: {
      best_for: string;
      key_success_factors: string[];
    };
  };
}

export interface StorySlide {
  id: number;
  role: string;
  visualGuidance: string;
  script: string;
  tips: string;
}

export interface LegalWarning {
  slideId: number;
  text: string;
  matchedWord: string;
  law: '薬機法' | '景表法';
  severity: 'high' | 'medium';
  suggestion: string;
}

export interface GenerationResult {
  patternId: string;
  slides: StorySlide[];
}

export interface GeneratedScript {
  id: string;
  brand_id: string;
  pattern_id: string;
  topic: string;
  vibe: string;
  slides: StorySlide[];
  created_at: string;
}

export interface GrowthLog {
  id: string;
  script_id: string;
  user_modifications: Array<{
    slide_id: number;
    original_text: string;
    modified_text: string;
    changes: string[];
  }>;
  engagement_metrics?: {
    impressions?: number;
    reactions?: number;
    dm_count?: number;
  };
  created_at: string;
}
