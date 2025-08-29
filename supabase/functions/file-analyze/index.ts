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
  
  // More aggressive cleaning for corrupted text
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove all control characters
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep only printable characters
    .replace(/\uFFFD/g, '') // Remove replacement characters
    .replace(/[^\w\s.,!?;:()\-'"]/g, ' ') // Keep only alphanumeric, spaces, and basic punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/(.)\1{3,}/g, '$1$1') // Remove excessive repetition
    .trim();
};

// Advanced PDF text extraction
function extractPdfText(buffer: ArrayBuffer): string {
  try {
    // Try multiple decoders for better character support
    let text = '';
    const decoders = [
      new TextDecoder('utf-8', { ignoreBOM: true }),
      new TextDecoder('iso-8859-1'),
      new TextDecoder('windows-1252')
    ];
    
    for (const decoder of decoders) {
      try {
        text = decoder.decode(buffer);
        if (text && text.length > 0) break;
      } catch (e) {
        continue;
      }
    }

    const textBlocks: string[] = [];
    
    // Method 1: Extract from BT...ET blocks (text objects)
    const textObjectRegex = /BT\s+([\s\S]*?)\s+ET/gi;
    let match;
    while ((match = textObjectRegex.exec(text)) !== null) {
      const textObject = match[1];
      
      // Extract from Tj commands
      const tjRegex = /\(\s*([^)]+)\s*\)\s*Tj/gi;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(textObject)) !== null) {
        const content = tjMatch[1];
        if (content && content.length > 1) {
          textBlocks.push(content);
        }
      }
      
      // Extract from TJ arrays
      const tjArrayRegex = /\[\s*([^\]]+)\s*\]\s*TJ/gi;
      let arrayMatch;
      while ((arrayMatch = tjArrayRegex.exec(textObject)) !== null) {
        const arrayContent = arrayMatch[1];
        const strings = arrayContent.match(/\([^)]*\)/g);
        if (strings) {
          strings.forEach(str => {
            const cleanStr = str.slice(1, -1);
            if (cleanStr && cleanStr.length > 1) {
              textBlocks.push(cleanStr);
            }
          });
        }
      }
    }
    
    // Method 2: Look for standalone parenthetical strings
    const standaloneRegex = /\(\s*([A-Za-zÀ-ÿ][^)]{2,})\s*\)/g;
    let standaloneMatch;
    while ((standaloneMatch = standaloneRegex.exec(text)) !== null) {
      const content = standaloneMatch[1];
      if (content && /[A-Za-zÀ-ÿ]/.test(content)) {
        textBlocks.push(content);
      }
    }

    // Join and clean the extracted text
    let extractedText = textBlocks.join(' ');
    
    // If no readable text found, return a message
    if (!extractedText || extractedText.length < 10) {
      return 'Document PDF téléversé avec succès. Le contenu sera analysé lors de la vectorisation.';
    }
    
    return cleanTextContent(extractedText);
    
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return 'Document PDF téléversé avec succès. Analysez le document pour extraire le contenu.';
  }
}

// Enhanced DOCX text extraction
function extractDocxText(buffer: ArrayBuffer): string {
  try {
    // Try multiple decoders
    let text = '';
    const decoders = [
      new TextDecoder('utf-8', { ignoreBOM: true }),
      new TextDecoder('iso-8859-1'),
      new TextDecoder('windows-1252')
    ];
    
    for (const decoder of decoders) {
      try {
        text = decoder.decode(buffer);
        if (text && text.includes('word/document.xml')) break;
      } catch (e) {
        continue;
      }
    }

    const textBlocks: string[] = [];
    
    // Extract Word XML text elements (more comprehensive)
    const patterns = [
      /<w:t[^>]*>\s*([^<]+?)\s*<\/w:t>/gi,
      /<t[^>]*>\s*([^<]+?)\s*<\/t>/gi,
      />\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s.,!?;:()\-'"]{3,})\s*</g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = match[1];
        if (content && content.trim().length > 2 && /[A-Za-zÀ-ÿ]/.test(content)) {
          textBlocks.push(content.trim());
        }
      }
    });
    
    // Remove duplicates and join
    const uniqueBlocks = [...new Set(textBlocks)];
    let extractedText = uniqueBlocks.join(' ');
    
    // If no readable text found, return a message
    if (!extractedText || extractedText.length < 10) {
      return 'Document DOCX téléversé avec succès. Le contenu sera analysé lors de la vectorisation.';
    }
    
    return cleanTextContent(extractedText);
    
  } catch (error) {
    console.error('DOCX text extraction error:', error);
    return 'Document DOCX téléversé avec succès. Analysez le document pour extraire le contenu.';
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