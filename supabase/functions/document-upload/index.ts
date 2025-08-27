import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    
    if (!file) {
      return new Response('No file provided', { status: 400, headers: corsHeaders });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return new Response('File type not supported', { status: 400, headers: corsHeaders });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const storagePath = `${user.id}/${Date.now()}_${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response('Failed to upload file', { status: 500, headers: corsHeaders });
    }

    let extractedText = '';
    let previewText = '';

    // Extract text based on file type
    if (file.type === 'text/plain') {
      const decoder = new TextDecoder();
      extractedText = decoder.decode(fileBuffer);
    } else if (file.type === 'application/pdf') {
      // For PDF, we'll use a simple approach - in production, use pdf-parse
      extractedText = 'PDF content extraction requires additional processing';
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For DOCX, we'll use a simple approach - in production, use mammoth.js
      extractedText = 'DOCX content extraction requires additional processing';
    }

    // Generate preview text (first 1000 characters)
    previewText = extractedText.substring(0, 1000);

    // Save document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        original_filename: fileName,
        file_type: fileExtension as 'pdf' | 'docx' | 'txt',
        file_size: file.size,
        storage_path: storagePath,
        extracted_text: extractedText,
        preview_text: previewText,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response('Failed to save document', { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ 
      document,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document-upload function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});