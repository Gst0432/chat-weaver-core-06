-- Add new columns for AI analysis to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS key_points TEXT[],
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS is_financial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS structure_info JSONB;