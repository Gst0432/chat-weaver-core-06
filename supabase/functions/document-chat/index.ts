import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
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

    const { documentId, question } = await req.json();

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

    // Try to get vectorized chunks first, fallback to extracted text
    let context = '';
    let chunksCount = 0;
    
    try {
      // Get question embedding
      const questionEmbedding = await getEmbedding(question);

      // Search for relevant chunks using the database function
      const { data: chunks, error: searchError } = await supabase
        .rpc('search_document_chunks', {
          doc_id: documentId,
          query_embedding: JSON.stringify(questionEmbedding),
          similarity_threshold: 0.7,
          match_count: 5
        });

      if (!searchError && chunks && chunks.length > 0) {
        // Use vectorized chunks if available
        context = chunks.map((chunk: any) => chunk.chunk_text).join('\n\n');
        chunksCount = chunks.length;
        console.log(`Using ${chunksCount} vectorized chunks for document ${documentId}`);
      } else {
        // Fallback to extracted text
        console.log(`No vectorized chunks found for document ${documentId}, using extracted text`);
        context = document.extracted_text || '';
        chunksCount = context ? 1 : 0;
      }
    } catch (error) {
      console.error('Error getting embeddings or chunks:', error);
      // Fallback to extracted text
      context = document.extracted_text || '';
      chunksCount = context ? 1 : 0;
    }
    
    // Generate answer using GPT
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
            content: `Vous êtes un assistant IA expert en analyse de documents. Répondez aux questions de l'utilisateur en vous basant uniquement sur le contexte fourni du document. Si la réponse ne peut pas être trouvée dans le contexte, dites-le clairement.`
          },
          {
            role: 'user',
            content: `Document: "${document.original_filename}"
            
Contexte extrait du document:
${context}

Question: ${question}

Répondez en vous basant uniquement sur le contexte fourni.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const answer = aiResponse.choices[0].message.content;

    // Save conversation
    const { error: saveError } = await supabase
      .from('document_conversations')
      .insert({
        document_id: documentId,
        user_id: user.id,
        question,
        answer,
        relevant_chunks: context ? [context] : []
      });

    if (saveError) {
      console.error('Save conversation error:', saveError);
    }

    return new Response(JSON.stringify({ 
      answer,
      relevant_chunks_count: chunksCount,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});