-- Create a comprehensive document management system with advanced features

-- Create documents table for storing uploaded files
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    preview_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_chunks table for RAG system
CREATE TABLE public.document_chunks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 embedding size
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_operations table for tracking conversions, translations, summaries
CREATE TABLE public.document_operations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('conversion', 'translation', 'summary', 'chat')),
    operation_params JSONB NOT NULL DEFAULT '{}',
    result_storage_path TEXT,
    result_filename TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create document_conversations table for chat history
CREATE TABLE public.document_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    relevant_chunks TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view their own documents" 
    ON public.documents FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
    ON public.documents FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
    ON public.documents FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
    ON public.documents FOR DELETE 
    USING (auth.uid() = user_id);

-- Create RLS policies for document_chunks
CREATE POLICY "Users can view chunks of their documents" 
    ON public.document_chunks FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.documents 
        WHERE documents.id = document_chunks.document_id 
        AND documents.user_id = auth.uid()
    ));

CREATE POLICY "Users can create chunks for their documents" 
    ON public.document_chunks FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.documents 
        WHERE documents.id = document_chunks.document_id 
        AND documents.user_id = auth.uid()
    ));

-- Create RLS policies for document_operations
CREATE POLICY "Users can view their own operations" 
    ON public.document_operations FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own operations" 
    ON public.document_operations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operations" 
    ON public.document_operations FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create RLS policies for document_conversations
CREATE POLICY "Users can view their document conversations" 
    ON public.document_conversations FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their document conversations" 
    ON public.document_conversations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_document_operations_user_id ON public.document_operations(user_id);
CREATE INDEX idx_document_operations_document_id ON public.document_operations(document_id);
CREATE INDEX idx_document_conversations_document_id ON public.document_conversations(document_id);

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
CREATE POLICY "Users can upload their own documents" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to search similar chunks
CREATE OR REPLACE FUNCTION public.search_document_chunks(
    doc_id UUID,
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.8,
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    chunk_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id as chunk_id,
        dc.chunk_text,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    WHERE dc.document_id = doc_id
        AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;