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
    const { messages, model = 'openai/gpt-4o-mini', temperature = 0.7, max_tokens = 2000, stream = true } = await req.json();

    console.log('🚀 OpenRouter streaming with model:', model);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://chatelix.com',
        'X-Title': 'Chatelix AI Platform'
      },
      body: JSON.stringify({
        model,
        messages: Array.isArray(messages) ? messages : [],
        temperature,
        max_tokens,
        stream
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${error}`);
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
                    console.warn('Error parsing OpenRouter stream chunk:', e);
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
        text: generatedText,
        content: generatedText,
        model,
        rawResponse: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('❌ OpenRouter streaming error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});