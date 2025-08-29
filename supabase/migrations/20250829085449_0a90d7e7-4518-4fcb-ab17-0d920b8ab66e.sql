-- Fix critical security issue: Add RLS policies for document_chunks table
CREATE POLICY "Users can view chunks for their documents" 
ON public.document_chunks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_chunks.document_id 
  AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can insert chunks for their documents" 
ON public.document_chunks 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_chunks.document_id 
  AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can update chunks for their documents" 
ON public.document_chunks 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_chunks.document_id 
  AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can delete chunks for their documents" 
ON public.document_chunks 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_chunks.document_id 
  AND documents.user_id = auth.uid()
));