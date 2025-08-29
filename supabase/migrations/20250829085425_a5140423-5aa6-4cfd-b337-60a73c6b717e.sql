-- Add missing columns to documents table for improved analysis tracking
ALTER TABLE public.documents 
ADD COLUMN analysis_status TEXT DEFAULT 'pending',
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN filename TEXT;

-- Update existing records
UPDATE public.documents 
SET filename = original_filename 
WHERE filename IS NULL;

-- Create index for faster analysis status queries
CREATE INDEX idx_documents_analysis_status ON public.documents(analysis_status);
CREATE INDEX idx_documents_user_status ON public.documents(user_id, analysis_status);