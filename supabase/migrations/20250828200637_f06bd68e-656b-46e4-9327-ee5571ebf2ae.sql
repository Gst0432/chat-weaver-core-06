-- Create storage bucket for documents if it doesn't exist
DO $$ 
BEGIN
  -- Create documents bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'documents', 
    'documents', 
    false, 
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create RLS policies for documents storage if they don't exist
DO $$
BEGIN
  -- Allow users to view their own documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own documents'
  ) THEN
    CREATE POLICY "Users can view their own documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Allow users to upload their own documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own documents'
  ) THEN
    CREATE POLICY "Users can upload their own documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Allow users to update their own documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own documents'
  ) THEN
    CREATE POLICY "Users can update their own documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Allow users to delete their own documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own documents'
  ) THEN
    CREATE POLICY "Users can delete their own documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

EXCEPTION
  WHEN others THEN NULL;
END $$;