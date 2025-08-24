import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!DEEPSEEK_API_KEY) {
      console.error('❌ DEEPSEEK_API_KEY is not set')
      return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, model = 'deepseek-v3', temperature = 0.7, max_tokens = 2000, stream = true } = await req.json();

    // Validate and fix model name
    const validModels = ['deepseek-v3', 'deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
    const finalModel = model === 'deepseek-chat' ? 'deepseek-v3' : (validModels.includes(model) ? model : 'deepseek-v3');
    
    if (finalModel !== model) {
      console.warn(`⚠️ Model "${model}" corrected to "${finalModel}"`);
    }

    console.log('🚀 DeepSeek streaming with model:', finalModel, 'stream:', stream);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: finalModel,
        messages: Array.isArray(messages) ? messages : [],
        temperature,
        max_tokens,
        stream
      })
    });

    console.log('📡 DeepSeek response status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ DeepSeek API error:', error);
      throw new Error(`DeepSeek API error (${response.status}): ${error}`);
    }

    if (stream) {
      // Return streaming response
      const readable = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) return;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n').filter(line => line.trim());

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices?.[0]?.delta?.content) {
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(parsed)}\n\n`));
                    }
                  } catch (e) {
                    console.warn('Error parsing DeepSeek stream chunk:', e);
                  }
                }
              }
            }
          } finally {
            controller.close();
          }
        }
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // Return regular response
      const data = await response.json();
      const generatedText = data?.choices?.[0]?.message?.content ?? '';
      
      return new Response(JSON.stringify({ 
        generatedText,
        content: generatedText,
        model: finalModel,
        raw: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('❌ DeepSeek streaming error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});