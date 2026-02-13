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

export interface StorySlide {
  id: number;
  role: string;
  visualGuidance: string;
  script: string;
  tips: string;
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
