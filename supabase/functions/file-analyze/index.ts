import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Improved text extraction for PDF using binary analysis
function extractPdfTextImproved(buffer: Uint8Array): string {
  const textMatches: string[] = [];
  
  try {
    // Convert buffer to string for pattern matching
    const text = new TextDecoder('latin1').decode(buffer);
    
    // Multiple extraction patterns for PDF text
    const patterns = [
      // Text in parentheses with proper escaping
      /\(([^\)\\]*(\\.[^\)\\]*)*)\)/g,
      // BT/ET text blocks
      /BT\s*.*?\s*Tj\s*ET/gs,
      // Direct text commands
      /Tj\s*\[(.*?)\]/g,
      // Simple text strings
      /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && textMatches.length < 3000) {
        let content = match[1] || match[0];
        
        // Clean and decode PDF text
        content = content
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\(.)/g, '$1')
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .trim();
        
        if (content && content.length > 2 && /[A-Za-zÀ-ÿ]/.test(content)) {
          textMatches.push(content);
        }
      }
    });
    
    // Fallback: extract readable text sequences
    if (textMatches.length < 10) {
      const readableText = text.match(/[A-Za-zÀ-ÿ0-9\s.,!?;:()\-'"€$%]{15,}/g);
      if (readableText) {
        textMatches.push(...readableText.slice(0, 100));
      }
    }
    
  } catch (error) {
    console.log('PDF extraction error:', error);
  }
  
  return textMatches.join(' ').substring(0, 50000);
}

// Improved text extraction for DOCX using binary analysis  
function extractDocxTextImproved(buffer: Uint8Array): string {
  const textMatches: string[] = [];
  
  try {
    // Convert buffer to string for pattern matching
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    
    // Extract Word XML text elements
    const patterns = [
      // Standard Word text tags
      /<w:t[^>]*>([^<]+)<\/w:t>/gi,
      // Text in run elements
      /<w:r[^>]*>.*?<w:t[^>]*>([^<]+)<\/w:t>.*?<\/w:r>/gi,
      // Paragraph text
      /<w:p[^>]*>.*?<w:t[^>]*>([^<]+)<\/w:t>.*?<\/w:p>/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && textMatches.length < 3000) {
        const content = match[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
          .trim();
        
        if (content && content.length > 2 && /[A-Za-zÀ-ÿ]/.test(content)) {
          textMatches.push(content);
        }
      }
    });
    
    // Fallback: extract readable text from XML
    if (textMatches.length < 10) {
      const cleanXml = text.replace(/<[^>]+>/g, ' ');
      const readableText = cleanXml.match(/[A-Za-zÀ-ÿ0-9\s.,!?;:()\-'"€$%]{15,}/g);
      if (readableText) {
        textMatches.push(...readableText.slice(0, 100));
      }
    }
    
  } catch (error) {
    console.log('DOCX extraction error:', error);
  }
  
  return textMatches.join(' ').substring(0, 50000);
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
        extractedText = extractPdfTextImproved(uint8Buffer);
      } else if (document.file_type === 'docx') {
        extractedText = extractDocxTextImproved(uint8Buffer);
      } else if (document.file_type === 'txt') {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        extractedText = decoder.decode(uint8Buffer).substring(0, 50000);
      } else {
        extractedText = '';
        analysisStatus = 'unsupported_format';
      }

      // Clean and normalize text
      extractedText = extractedText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E\u00A0-\u017F\u0100-\u024F]/g, '')
        .trim();
      
      // Check if extraction was successful
      if (extractedText.length < 50 || !/[A-Za-zÀ-ÿ]{3,}/.test(extractedText)) {
        extractedText = 'Contenu du document détecté mais extraction textuelle limitée. Vous pouvez utiliser le chat IA pour analyser le document.';
        analysisStatus = 'minimal_content';
      }
      
    } catch (error) {
      console.error('Text extraction error:', error);
      extractedText = 'Erreur lors de l\'extraction du texte. Le document peut être analysé via le chat IA.';
      analysisStatus = 'extraction_error';
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