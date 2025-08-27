import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

function chunkText(text: string, maxChunkSize = 2000): string[] {
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

async function translateChunk(text: string, targetLanguage: string): Promise<string> {
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
          content: `Vous êtes un traducteur professionnel. Traduisez le texte suivant en ${targetLanguage} en conservant le formatage, la structure et le sens original. Ne traduisez que le contenu, pas les instructions.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
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

    const { documentId, targetLanguage } = await req.json();

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
      return new Response('No text content to translate', { status: 400, headers: corsHeaders });
    }

    // Create operation record
    const { data: operation, error: opError } = await supabase
      .from('document_operations')
      .insert({
        user_id: user.id,
        document_id: documentId,
        operation_type: 'translation',
        operation_params: { target_language: targetLanguage },
        status: 'processing'
      })
      .select()
      .single();

    if (opError) {
      return new Response('Failed to create operation', { status: 500, headers: corsHeaders });
    }

    try {
      // Split text into chunks for translation
      const chunks = chunkText(document.extracted_text);
      console.log(`Translating ${chunks.length} chunks to ${targetLanguage}`);
      
      const translatedChunks: string[] = [];
      
      // Process chunks with delays to respect rate limits
      for (let i = 0; i < chunks.length; i++) {
        const translatedChunk = await translateChunk(chunks[i], targetLanguage);
        translatedChunks.push(translatedChunk);
        
        // Update progress
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        await supabase
          .from('document_operations')
          .update({ 
            operation_params: { 
              target_language: targetLanguage, 
              progress 
            } 
          })
          .eq('id', operation.id);
        
        // Rate limiting delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      const translatedText = translatedChunks.join('\n\n');
      
      // Generate filename for translated document
      const originalName = document.original_filename;
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const ext = originalName.substring(originalName.lastIndexOf('.'));
      const translatedFilename = `${nameWithoutExt}_${targetLanguage}${ext}`;
      
      // Save translated content as new file
      const storagePath = `${user.id}/translated_${Date.now()}_${translatedFilename}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, new Blob([translatedText], { type: 'text/plain' }), {
          contentType: 'text/plain',
        });

      if (uploadError) {
        throw new Error('Failed to save translated file');
      }

      // Update operation as completed
      await supabase
        .from('document_operations')
        .update({
          status: 'completed',
          result_storage_path: storagePath,
          result_filename: translatedFilename,
          completed_at: new Date().toISOString()
        })
        .eq('id', operation.id);

      return new Response(JSON.stringify({ 
        success: true,
        operation_id: operation.id,
        filename: translatedFilename,
        storage_path: storagePath
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
    console.error('Error in document-translate function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});