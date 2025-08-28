import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import pdfParse from 'https://esm.sh/pdf-parse@1.1.1';
import mammoth from 'https://esm.sh/mammoth@1.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to clean text content (remove null bytes and control characters)
const cleanTextContent = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\u0000/g, '') // Remove null bytes that cause PostgreSQL errors
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove other control characters
    .replace(/\uFFFD/g, '') // Remove replacement characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Additional cleanup for binary characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Advanced PDF text extraction using pdf-parse
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const data = await pdfParse(uint8Array);
    return cleanTextContent(data.text);
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Impossible d\'extraire le texte du PDF');
  }
}

// Advanced DOCX text extraction using mammoth
async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const result = await mammoth.extractRawText({ buffer: uint8Array });
    return cleanTextContent(result.value);
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Impossible d\'extraire le texte du document Word');
  }
}

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
    let extractionStatus = 'success';
    let extractionError = null;

    try {
      // Extract text based on file type
      if (file.type === 'text/plain') {
        const decoder = new TextDecoder();
        extractedText = cleanTextContent(decoder.decode(fileBuffer));
      } else if (file.type === 'application/pdf') {
        try {
          console.log('Extracting PDF content using pdf-parse...');
          extractedText = await extractPdfText(fileBuffer);
          if (!extractedText.trim()) {
            extractedText = 'Le PDF semble être vide ou composé principalement d\'images. Utilisez la vectorisation pour le chat IA.';
            extractionStatus = 'partial';
          }
        } catch (error) {
          console.error('PDF extraction error:', error);
          extractedText = 'Extraction PDF échouée. Le document est disponible pour la vectorisation et le chat IA.';
          extractionStatus = 'partial';
          extractionError = error.message;
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          console.log('Extracting DOCX content using mammoth...');
          extractedText = await extractDocxText(fileBuffer);
          if (!extractedText.trim()) {
            extractedText = 'Le document DOCX semble être vide. Utilisez la vectorisation pour le chat IA.';
            extractionStatus = 'partial';
          }
        } catch (error) {
          console.error('DOCX extraction error:', error);
          extractedText = 'Extraction DOCX échouée. Le document est disponible pour la vectorisation et le chat IA.';
          extractionStatus = 'partial';
          extractionError = error.message;
        }
      }
    } catch (error) {
      console.error('General extraction error:', error);
      extractedText = 'Erreur lors de l\'extraction du contenu. Vous pouvez toujours utiliser le chat AI avec ce document.';
      extractionStatus = 'failed';
      extractionError = error.message;
    }

    // Clean and generate preview text (first 1000 characters)
    const cleanExtractedText = cleanTextContent(extractedText);
    previewText = cleanExtractedText.substring(0, 1000);

    // Save document record with extraction status
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        original_filename: fileName,
        file_type: fileExtension as 'pdf' | 'docx' | 'txt',
        file_size: file.size,
        storage_path: storagePath,
        extracted_text: cleanExtractedText,
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
      success: true,
      extraction_status: extractionStatus,
      extraction_error: extractionError
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