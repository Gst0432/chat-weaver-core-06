import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

function chunkText(text: string, maxChunkSize = 3000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function summarizeChunk(text: string, summaryType: string, style: string): Promise<string> {
  const stylePrompts = {
    'academic': 'Utilisez un ton académique et formel avec des termes techniques appropriés.',
    'simple': 'Utilisez un langage simple et accessible, évitez le jargon technique.',
    'storytelling': 'Adoptez un style narratif engageant, comme si vous racontiez une histoire.',
  };

  const lengthPrompts = {
    'detailed': 'Créez un résumé détaillé qui préserve les nuances et les détails importants.',
    'concise': 'Créez un résumé très concis qui capture uniquement les points essentiels.',
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un expert en synthèse de documents. ${lengthPrompts[summaryType]} ${stylePrompts[style]} Conservez la structure logique et les idées principales.`
        },
        {
          role: 'user',
          content: `Résumez ce texte :\n\n${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: summaryType === 'detailed' ? 2000 : 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateFinalSummary(summaries: string[], summaryType: string, style: string): Promise<string> {
  const stylePrompts = {
    'academic': 'Utilisez un ton académique et formel.',
    'simple': 'Utilisez un langage simple et accessible.',
    'storytelling': 'Adoptez un style narratif engageant.',
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Vous synthétisez plusieurs résumés partiels en un résumé cohérent et unifié. ${stylePrompts[style]} Assurez-vous que le résumé final soit bien structuré et capture l'essence globale du document.`
        },
        {
          role: 'user',
          content: `Voici plusieurs résumés partiels d'un même document. Créez un résumé unifié et cohérent :\n\n${summaries.join('\n\n---\n\n')}`
        }
      ],
      temperature: 0.3,
      max_tokens: summaryType === 'detailed' ? 3000 : 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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

    const { documentId, summaryType = 'detailed', style = 'simple' } = await req.json();

    // Validate parameters
    if (!['detailed', 'concise'].includes(summaryType)) {
      return new Response('Invalid summary type', { status: 400, headers: corsHeaders });
    }
    
    if (!['academic', 'simple', 'storytelling'].includes(style)) {
      return new Response('Invalid style', { status: 400, headers: corsHeaders });
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return new Response('Document not found', { status: 404, headers: corsHeaders });
    }

    if (!document.extracted_text) {
      return new Response('No text content to summarize', { status: 400, headers: corsHeaders });
    }

    // Create operation record
    const { data: operation, error: opError } = await supabase
      .from('document_operations')
      .insert({
        user_id: user.id,
        document_id: documentId,
        operation_type: 'summary',
        operation_params: { summary_type: summaryType, style },
        status: 'processing'
      })
      .select()
      .single();

    if (opError) {
      return new Response('Failed to create operation', { status: 500, headers: corsHeaders });
    }

    try {
      // Split text into chunks for summarization
      const chunks = chunkText(document.extracted_text);
      console.log(`Summarizing ${chunks.length} chunks with type: ${summaryType}, style: ${style}`);
      
      const chunkSummaries: string[] = [];
      
      // Process chunks with progress updates
      for (let i = 0; i < chunks.length; i++) {
        const chunkSummary = await summarizeChunk(chunks[i], summaryType, style);
        chunkSummaries.push(chunkSummary);
        
        // Update progress
        const progress = Math.round(((i + 1) / chunks.length) * 80); // 80% for chunk processing
        await supabase
          .from('document_operations')
          .update({ 
            operation_params: { 
              summary_type: summaryType, 
              style, 
              progress 
            } 
          })
          .eq('id', operation.id);
        
        // Rate limiting delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Generate final unified summary
      let finalSummary: string;
      if (chunkSummaries.length === 1) {
        finalSummary = chunkSummaries[0];
      } else {
        finalSummary = await generateFinalSummary(chunkSummaries, summaryType, style);
      }
      
      // Update progress to 90%
      await supabase
        .from('document_operations')
        .update({ 
          operation_params: { 
            summary_type: summaryType, 
            style, 
            progress: 90 
          } 
        })
        .eq('id', operation.id);
      
      // Generate filename for summary
      const originalName = document.original_filename;
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const summaryFilename = `${nameWithoutExt}_resume_${summaryType}_${style}.txt`;
      
      // Save summary as new file
      const storagePath = `${user.id}/summary_${Date.now()}_${summaryFilename}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, new Blob([finalSummary], { type: 'text/plain' }), {
          contentType: 'text/plain',
        });

      if (uploadError) {
        throw new Error('Failed to save summary file');
      }

      // Update operation as completed
      await supabase
        .from('document_operations')
        .update({
          status: 'completed',
          result_storage_path: storagePath,
          result_filename: summaryFilename,
          operation_params: { 
            summary_type: summaryType, 
            style, 
            progress: 100 
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', operation.id);

      return new Response(JSON.stringify({ 
        success: true,
        operation_id: operation.id,
        filename: summaryFilename,
        storage_path: storagePath,
        preview: finalSummary.substring(0, 500) + '...'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Update operation as failed
      await supabase
        .from('document_operations')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', operation.id);
      
      throw error;
    }

  } catch (error) {
    console.error('Error in document-summarize function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});