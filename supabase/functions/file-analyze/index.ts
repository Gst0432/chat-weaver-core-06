import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Advanced PDF text extraction with better encoding handling
function extractPdfTextAdvanced(buffer: Uint8Array): string {
  const textBlocks: string[] = [];
  
  try {
    // Try UTF-8 first, then fallback to latin1 if needed
    let pdfString: string;
    try {
      pdfString = new TextDecoder('utf-8').decode(buffer);
    } catch {
      pdfString = new TextDecoder('latin1').decode(buffer);
    }
    
    // Look for text content patterns, avoiding binary structures
    const patterns = [
      // Text in parentheses with text operators (most reliable)
      /\(([^)]{2,})\)\s*(?:Tj|TJ|'|")/g,
      
      // Text arrays (handle spaced text)
      /\[([^\]]*)\]\s*TJ/g,
      
      // BT/ET blocks containing actual text
      /BT[\s\S]*?\(([^)]{2,})\)[\s\S]*?ET/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(pdfString)) !== null && textBlocks.length < 1000) {
        let text = match[1];
        
        if (!text || text.length < 2) continue;
        
        // Clean escape sequences
        text = text
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r') 
          .replace(/\\t/g, '\t')
          .replace(/\\(.)/g, '$1');
        
        // Only keep text that looks like actual content
        if (/[a-zA-ZÀ-ÿ]{2,}/.test(text) && !/^[\d\s\-.,]+$/.test(text)) {
          textBlocks.push(text);
        }
      }
    });
    
    // Handle text arrays specially for TJ operator
    const tjArrayPattern = /\[([^\]]+)\]\s*TJ/g;
    let tjMatch;
    while ((tjMatch = tjArrayPattern.exec(pdfString)) !== null && textBlocks.length < 1000) {
      const arrayContent = tjMatch[1];
      const textParts = arrayContent.match(/\(([^)]+)\)/g);
      
      if (textParts && textParts.length > 0) {
        let combinedText = '';
        textParts.forEach(part => {
          const cleanPart = part.slice(1, -1).replace(/\\(.)/g, '$1');
          if (/[a-zA-ZÀ-ÿ]/.test(cleanPart)) {
            combinedText += cleanPart + ' ';
          }
        });
        
        if (combinedText.trim().length > 2) {
          textBlocks.push(combinedText.trim());
        }
      }
    }
    
    const extractedText = textBlocks.join(' ');
    const cleanedText = cleanTextContent(extractedText);
    
    // Validate the extracted text
    if (!isTextReadable(cleanedText)) {
      throw new Error('Extracted text appears to be corrupted or binary data');
    }
    
    return cleanedText;
    
  } catch (error) {
    console.error('Advanced PDF extraction error:', error);
    throw error; // Re-throw to trigger fallback handling
  }
}

// Simple FlateDecode decompression attempt
function decompressFlateDecode(data: string): string | null {
  try {
    // Convert string to bytes
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i);
    }
    
    // For now, return null as full decompression requires zlib
    // In a real implementation, you'd use a proper deflate library
    return null;
  } catch (error) {
    console.log('Decompression failed:', error);
    return null;
  }
}

// Extract text from decompressed PDF content
function extractTextFromDecompressed(content: string): string {
  const textMatches: string[] = [];
  
  // Look for text operators in decompressed content
  const patterns = [
    /\(([^)]+)\)\s*Tj/g,
    /\[(.*?)\]\s*TJ/g,
    /BT\s*([\s\S]*?)\s*ET/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1] || match[0];
      if (text && text.length > 2 && /[A-Za-zÀ-ÿ]/.test(text)) {
        textMatches.push(text);
      }
    }
  });
  
  return textMatches.join(' ');
}

// Enhanced DOCX extraction with better XML parsing
function extractDocxTextAdvanced(buffer: Uint8Array): string {
  const textBlocks: string[] = [];
  
  try {
    const docxString = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    
    // Enhanced XML text extraction patterns
    const patterns = [
      // Standard Word text elements
      /<w:t[^>]*>([^<]+)<\/w:t>/gi,
      // Text in runs with formatting
      /<w:r[^>]*>.*?<w:t[^>]*>([^<]+)<\/w:t>.*?<\/w:r>/gi,
      // Paragraph content
      /<w:p[^>]*>(.*?)<\/w:p>/gi,
      // Table cell content
      /<w:tc[^>]*>.*?<w:t[^>]*>([^<]+)<\/w:t>.*?<\/w:tc>/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(docxString)) !== null && textBlocks.length < 5000) {
        let content = match[1];
        
        if (content) {
          // Decode XML entities
          content = content
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
            .trim();
          
          if (content.length > 2 && /[A-Za-zÀ-ÿ]/.test(content)) {
            textBlocks.push(content);
          }
        }
      }
    });
    
    return cleanTextContent(textBlocks.join(' '));
    
  } catch (error) {
    console.error('Advanced DOCX extraction error:', error);
    return 'Erreur lors de l\'extraction avancée du DOCX';
  }
}

// Clean and normalize extracted text to remove corrupted characters
function cleanTextContent(text: string): string {
  if (!text) return '';
  
  return text
    // Remove null bytes and control characters
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\uFFFD/g, '') // Remove replacement characters
    
    // Remove common PDF binary patterns that leak through
    .replace(/endobj|obj|stream|endstream|xref|trailer|startxref/g, '')
    .replace(/<<.*?>>/g, '')
    .replace(/\[\d+\s+\d+\s+R\]/g, '')
    
    // Remove sequences of non-printable characters (corrupted binary data)
    .replace(/[^\x20-\x7E\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF\s]{3,}/g, '')
    
    // Keep only readable characters (printable ASCII + extended Latin + common punctuation)
    .replace(/[^\x20-\x7E\u00A0-\u017F\u0100-\u024F\u1E00-\u1EFF\u2000-\u206F\u2C00-\u2C5F]/g, ' ')
    
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Validate if extracted text is readable and not corrupted
function isTextReadable(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Count readable characters (letters, numbers, common punctuation)
  const readableChars = (text.match(/[a-zA-ZÀ-ÿ0-9\s.,;:!?'"()\-]/g) || []).length;
  const totalChars = text.length;
  
  // Text should be at least 70% readable characters
  const readabilityRatio = readableChars / totalChars;
  
  // Should contain actual words (sequences of 3+ letters)
  const hasWords = /[a-zA-ZÀ-ÿ]{3,}/.test(text);
  
  // Should not be mostly repetitive patterns
  const uniqueChars = new Set(text.toLowerCase().split('')).size;
  const hasVariety = uniqueChars > 10;
  
  return readabilityRatio > 0.7 && hasWords && hasVariety;
}

// AI-powered document analysis
async function analyzeWithOpenAI(text: string, fileType: string): Promise<{
  summary: string;
  keyPoints: string[];
  documentType: string;
  isFinancial: boolean;
  structure: any;
}> {
  try {
    const prompt = `Analyse ce document ${fileType} et fournis une analyse structurée en français :

TEXTE DU DOCUMENT:
${text.substring(0, 8000)}

Fournis ta réponse au format JSON avec cette structure exacte :
{
  "summary": "Résumé du document en 2-3 phrases",
  "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "documentType": "Type de document (rapport, contrat, facture, etc.)",
  "isFinancial": true/false,
  "structure": {
    "hasNumbers": true/false,
    "hasTables": true/false,
    "estimatedPages": nombre_estimé
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: 'Tu es un expert en analyse de documents. Réponds toujours en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse JSON response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid JSON response from OpenAI');
    
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return {
      summary: 'Analyse automatique indisponible. Document prêt pour interrogation manuelle.',
      keyPoints: ['Contenu extrait avec succès', 'Prêt pour questions personnalisées'],
      documentType: fileType === 'pdf' ? 'Document PDF' : 'Document Word',
      isFinancial: false,
      structure: { hasNumbers: false, hasTables: false, estimatedPages: 1 }
    };
  }
}

// Background task for processing
async function processDocumentInBackground(
  supabase: any,
  documentId: string,
  extractedText: string,
  fileType: string
) {
  try {
    console.log('Starting AI analysis for document:', documentId);
    
    const analysis = await analyzeWithOpenAI(extractedText, fileType);
    
    // Update document with AI analysis
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        ai_summary: analysis.summary,
        key_points: analysis.keyPoints,
        document_type: analysis.documentType,
        is_financial: analysis.isFinancial,
        structure_info: analysis.structure,
        analysis_status: 'ai_completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    if (updateError) {
      console.error('Error updating AI analysis:', updateError);
    } else {
      console.log('AI analysis completed for document:', documentId);
    }
    
  } catch (error) {
    console.error('Background processing error:', error);
    
    // Update with error status
    await supabase
      .from('documents')
      .update({
        analysis_status: 'error',
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);
  }
}

// Get status message based on analysis status
function getStatusMessage(status: string, hasOpenAI: boolean): string {
  switch (status) {
    case 'text_extracted':
      return hasOpenAI ? 'Analyse IA en cours...' : 'Texte extrait avec succès';
    case 'minimal_content':
      return 'Contenu détecté. Extraction textuelle limitée - utilisez le chat IA pour plus d\'informations';
    case 'extraction_error':
      return 'Erreur d\'extraction - le document peut être analysé via le chat IA';
    case 'unsupported_format':
      return 'Format non pris en charge - utilisez le chat IA pour analyser le document';
    case 'ai_processing':
      return 'Analyse IA en cours...';
    default:
      return 'Document traité';
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
    
    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return new Response('Document not found', { status: 404, headers: corsHeaders });
    }

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      return new Response('Failed to download file', { status: 500, headers: corsHeaders });
    }

    console.log(`Processing ${document.file_type}: ${document.original_filename}`);
    
    // Enhanced text extraction with proper binary handling
    const fileBuffer = await fileData.arrayBuffer();
    const uint8Buffer = new Uint8Array(fileBuffer);
    
    let extractedText = '';
    let analysisStatus = 'text_extracted';
    
    try {
      if (document.file_type === 'pdf') {
        extractedText = extractPdfTextAdvanced(uint8Buffer);
      } else if (document.file_type === 'docx') {
        extractedText = extractDocxTextAdvanced(uint8Buffer);
      } else if (document.file_type === 'txt') {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        extractedText = cleanTextContent(decoder.decode(uint8Buffer)).substring(0, 50000);
      } else {
        extractedText = '';
        analysisStatus = 'unsupported_format';
      }

      // Enhanced validation - check if text is actually readable
      if (!extractedText || extractedText.length < 50) {
        throw new Error('No text extracted from document');
      }
      
      if (!isTextReadable(extractedText)) {
        throw new Error('Extracted text appears corrupted or contains mostly binary data');
      }
      
      // Additional cleaning for successful extractions
      extractedText = cleanTextContent(extractedText);
      
      // Final validation after cleaning
      if (extractedText.length < 50 || !isTextReadable(extractedText)) {
        throw new Error('Text became unreadable after cleaning');
      }
      
      analysisStatus = 'text_extracted';
      console.log(`Successfully extracted ${extractedText.length} characters of readable text`);
      
    } catch (error) {
      console.error('Text extraction failed:', error.message);
      
      // Provide a proper fallback message for complex documents
      extractedText = `Extraction de texte limitée pour ce document ${document.file_type.toUpperCase()}.

Ce document utilise probablement :
• Compression avancée (FlateDecode, LZW)
• Polices intégrées ou personnalisées  
• Images et graphiques complexes
• Protection ou chiffrement partiel

💡 Solutions disponibles :
• Utilisez le chat IA pour analyser le contenu
• Le système peut traiter les documents même sans extraction complète
• Convertissez le document dans un format plus simple si nécessaire

Le chat IA peut souvent comprendre le contenu même quand l'extraction automatique échoue.`;
      
      analysisStatus = 'extraction_limited';
    }

    const previewText = extractedText.length > 1000 ? 
      extractedText.substring(0, 997) + '...' : 
      extractedText;
    
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extractedText,
        preview_text: previewText,
        analysis_status: analysisStatus,
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    if (updateError) {
      throw new Error('Failed to update document');
    }

    // Start AI analysis in background if OpenAI is available and text extraction was successful
    if (openAIApiKey && analysisStatus === 'text_extracted' && extractedText.length > 100) {
      // Update status to indicate AI processing is starting
      await supabase
        .from('documents')
        .update({ analysis_status: 'ai_processing' })
        .eq('id', documentId);
        
      EdgeRuntime.waitUntil(
        processDocumentInBackground(supabase, documentId, extractedText, document.file_type)
      );
    }

    console.log(`Document processed successfully. Text length: ${extractedText.length}`);

    return new Response(JSON.stringify({
      success: true,
      extracted_text: extractedText,
      preview_text: previewText,
      length: extractedText.length,
      wordCount,
      file_type: document.file_type,
      filename: document.original_filename,
      analysis_status: (openAIApiKey && analysisStatus === 'text_extracted') ? 'ai_processing' : analysisStatus,
      message: getStatusMessage(analysisStatus, openAIApiKey)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in file-analyze function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});