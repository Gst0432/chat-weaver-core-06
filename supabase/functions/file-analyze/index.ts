import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to clean text content
const cleanTextContent = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\uFFFD/g, '') // Remove replacement characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Additional cleanup
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Advanced PDF text extraction
function extractPdfText(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  const text = decoder.decode(buffer);
  const textBlocks: string[] = [];
  
  try {
    // Method 1: Extract text from PDF streams
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(text)) !== null) {
      const streamContent = streamMatch[1];
      
      // Look for readable text in the stream
      const readableText = streamContent.match(/[a-zA-ZÀ-ÿ\s.,!?;:'"()-]{4,}/g);
      if (readableText) {
        textBlocks.push(...readableText);
      }
    }

    // Method 2: Extract text from text objects
    const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let textMatch;
    while ((textMatch = textObjectRegex.exec(text)) !== null) {
      const textObject = textMatch[1];
      
      // Extract text from Tj and TJ operators
      const tjMatches = textObject.match(/\((.*?)\)\s*Tj/g);
      if (tjMatches) {
        tjMatches.forEach(match => {
          const content = match.replace(/\((.*?)\)\s*Tj/, '$1');
          if (content.length > 2 && /[a-zA-ZÀ-ÿ]/.test(content)) {
            textBlocks.push(content);
          }
        });
      }

      // Extract text from array notation
      const arrayMatches = textObject.match(/\[(.*?)\]\s*TJ/g);
      if (arrayMatches) {
        arrayMatches.forEach(match => {
          const content = match.replace(/\[(.*?)\]\s*TJ/, '$1');
          const cleanContent = content.replace(/[()]/g, '').replace(/\d+/g, ' ');
          if (cleanContent.length > 3 && /[a-zA-ZÀ-ÿ]/.test(cleanContent)) {
            textBlocks.push(cleanContent);
          }
        });
      }
    }

    // Method 3: Look for simple parenthetical text
    const simpleMatches = text.match(/\(([a-zA-ZÀ-ÿ\s.,!?;:'"()-]{5,})\)/g);
    if (simpleMatches) {
      simpleMatches.forEach(match => {
        const content = match.slice(1, -1);
        textBlocks.push(content);
      });
    }

    return cleanTextContent(textBlocks.join(' '));
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return 'Erreur lors de l\'extraction du texte PDF.';
  }
}

// Enhanced DOCX text extraction
function extractDocxText(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  const text = decoder.decode(buffer);
  const textBlocks: string[] = [];
  
  try {
    // Extract Word XML text elements
    const xmlMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (xmlMatches) {
      xmlMatches.forEach(match => {
        const content = match.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1');
        if (content.trim().length > 0) {
          textBlocks.push(content.trim());
        }
      });
    }
    
    // Extract paragraph content
    const paraMatches = text.match(/<w:p[^>]*>(.*?)<\/w:p>/gs);
    if (paraMatches) {
      paraMatches.forEach(match => {
        const textContent = match.replace(/<[^>]+>/g, ' ');
        const cleanContent = textContent.replace(/\s+/g, ' ').trim();
        if (cleanContent.length > 3 && /[a-zA-ZÀ-ÿ]/.test(cleanContent)) {
          textBlocks.push(cleanContent);
        }
      });
    }

    return cleanTextContent(textBlocks.join(' '));
  } catch (error) {
    console.error('DOCX text extraction error:', error);
    return 'Erreur lors de l\'extraction du texte DOCX.';
  }
}

serve(async (req) => {
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

    const { documentId } = await req.json();
    
    // Get document info from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return new Response('Document not found', { status: 404, headers: corsHeaders });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      return new Response('Failed to download file', { status: 500, headers: corsHeaders });
    }

    const fileBuffer = await fileData.arrayBuffer();
    let extractedText = '';

    // Extract text based on file type
    if (document.file_type === 'pdf') {
      extractedText = extractPdfText(fileBuffer);
    } else if (document.file_type === 'docx') {
      extractedText = extractDocxText(fileBuffer);
    } else if (document.file_type === 'txt') {
      const decoder = new TextDecoder();
      extractedText = cleanTextContent(decoder.decode(fileBuffer));
    }

    // Update document with extracted text
    if (extractedText && extractedText.length > 50) {
      const previewText = extractedText.substring(0, 1000);
      
      await supabase
        .from('documents')
        .update({
          extracted_text: extractedText,
          preview_text: previewText
        })
        .eq('id', documentId);
    }

    return new Response(JSON.stringify({
      success: true,
      extracted_text: extractedText,
      preview_text: extractedText.substring(0, 1000),
      length: extractedText.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in file-analyze function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});