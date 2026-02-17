-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  brand_tone TEXT NOT NULL,
  logo_url TEXT,
  knowledge_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor patterns table
CREATE TABLE IF NOT EXISTS competitor_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  account_name TEXT NOT NULL,
  category TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  skeleton JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated scripts table
CREATE TABLE IF NOT EXISTS generated_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES competitor_patterns(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  vibe TEXT NOT NULL,
  slides JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Script rewrites table
CREATE TABLE IF NOT EXISTS script_rewrites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES generated_scripts(id) ON DELETE CASCADE,
  slide_id INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  rewritten_text TEXT NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Growth logs table
CREATE TABLE IF NOT EXISTS growth_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES generated_scripts(id) ON DELETE CASCADE,
  user_modifications JSONB NOT NULL,
  engagement_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_scripts_brand_id ON generated_scripts(brand_id);
CREATE INDEX IF NOT EXISTS idx_generated_scripts_pattern_id ON generated_scripts(pattern_id);
CREATE INDEX IF NOT EXISTS idx_generated_scripts_created_at ON generated_scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_rewrites_script_id ON script_rewrites(script_id);
CREATE INDEX IF NOT EXISTS idx_growth_logs_script_id ON growth_logs(script_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitor_patterns_updated_at
  BEFORE UPDATE ON competitor_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
