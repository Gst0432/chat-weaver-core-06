import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Optimized text extraction for PDF
function extractPdfTextOptimized(text: string): string {
  const textMatches: string[] = [];
  
  // Extract text within parentheses (most reliable method)
  const regex = /\(([^)]{2,200})\)/g;
  let match;
  while ((match = regex.exec(text)) !== null && textMatches.length < 5000) {
    const content = match[1].trim();
    if (content && /[A-Za-zÀ-ÿ]/.test(content)) {
      textMatches.push(content);
    }
  }
  
  return textMatches.join(' ').substring(0, 50000); // Limit to 50k chars
}

// Optimized text extraction for DOCX
function extractDocxTextOptimized(text: string): string {
  const textMatches: string[] = [];
  
  // Extract Word text elements
  const patterns = [
    /<w:t[^>]*>([^<]{1,200})<\/w:t>/gi,
    />([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.,!?;:()\-'"€$%]{10,100})</g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null && textMatches.length < 3000) {
      const content = match[1].trim();
      if (content && content.length > 3) {
        textMatches.push(content);
      }
    }
  });
  
  return textMatches.join(' ').substring(0, 50000); // Limit to 50k chars
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

    console.log(`Processing ${document.file_type}: ${document.filename}`);
    
    // Quick text extraction
    const fileBuffer = await fileData.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const rawText = decoder.decode(fileBuffer);
    
    let extractedText = '';
    if (document.file_type === 'pdf') {
      extractedText = extractPdfTextOptimized(rawText);
    } else if (document.file_type === 'docx') {
      extractedText = extractDocxTextOptimized(rawText);
    } else if (document.file_type === 'txt') {
      extractedText = rawText.substring(0, 50000);
    } else {
      extractedText = 'Type de fichier non pris en charge.';
    }

    // Clean and prepare text
    extractedText = extractedText
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

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
        analysis_status: 'text_extracted',
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    if (updateError) {
      throw new Error('Failed to update document');
    }

    // Start AI analysis in background if OpenAI is available
    if (openAIApiKey && extractedText.length > 100) {
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
      analysis_status: openAIApiKey ? 'ai_processing' : 'text_extracted',
      message: openAIApiKey ? 'Analyse IA en cours...' : 'Texte extrait avec succès'
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