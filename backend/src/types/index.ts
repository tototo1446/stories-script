// Database types
export interface Brand {
  id: string;
  name: string;
  product_description: string;
  target_audience: string;
  brand_tone: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorPattern {
  id: string;
  name: string;
  description: string;
  account_name: string;
  category: string | null;
  skeleton: {
    skeleton: Array<{
      slide_number: number;
      role: string;
      recommended_elements: string[];
      copy_pattern: string;
      visual_instruction: string;
    }>;
    template_name: string;
    category: string;
    total_slides: number;
    summary: {
      best_for: string;
      key_success_factors: string[];
    };
  };
  created_at: string;
  updated_at: string;
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

export interface StorySlide {
  id: number;
  role: string;
  visualGuidance: string;
  script: string;
  tips: string;
}

export interface ScriptRewrite {
  id: string;
  script_id: string;
  original_text: string;
  rewritten_text: string;
  instruction: string;
  created_at: string;
}

export interface GrowthLog {
  id: string;
  script_id: string;
  user_modifications: {
    slide_id: number;
    original_text: string;
    modified_text: string;
    changes: string[];
  }[];
  engagement_metrics: {
    impressions?: number;
    reactions?: number;
    dm_count?: number;
  } | null;
  created_at: string;
}

// API Request/Response types
export interface AnalyzePatternRequest {
  account_name: string;
  category?: string;
  focus_point?: string;
  images: string[]; // base64 encoded images
}

export interface GenerateScriptRequest {
  brand_id: string;
  pattern_id: string;
  topic: string;
  vibe: string;
}

export interface RewriteScriptRequest {
  script_id: string;
  slide_id: number;
  instruction: string;
}

export interface CreateGrowthLogRequest {
  script_id: string;
  user_modifications: GrowthLog['user_modifications'];
  engagement_metrics?: GrowthLog['engagement_metrics'];
}
