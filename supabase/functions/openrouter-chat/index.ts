import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openRouterApiKey) {
    console.error('OpenRoute API key not found');
    return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages, model, temperature, max_tokens, max_completion_tokens, stream = false } = await req.json();

    console.log('🤖 OpenRouter chat request:', { model, stream, messageCount: messages?.length });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Prepare payload for OpenRouter
    const payload: any = {
      model: model || 'openai/gpt-4o-mini',
      messages: messages,
      stream: stream
    };

    // Add parameters based on model capabilities
    if (max_completion_tokens) {
      payload.max_completion_tokens = max_completion_tokens;
    } else if (max_tokens) {
      payload.max_tokens = max_tokens;
    }

    if (temperature !== undefined) {
      payload.temperature = temperature;
    }

    console.log('📤 Sending to OpenRouter:', { model: payload.model, stream: payload.stream });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'ChatElix AI Assistant'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    if (stream) {
      // Return streaming response
      const readableStream = new ReadableStream({
        start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (error) {
              console.error('Streaming error:', error);
              controller.error(error);
            }
          };
          pump();
        }
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Return regular JSON response
      const data = await response.json();
      console.log('✅ OpenRouter response received:', { 
        model: data.model, 
        usage: data.usage,
        choices: data.choices?.length 
      });

      const generatedText = data.choices?.[0]?.message?.content || '';
      
      return new Response(JSON.stringify({ 
        text: generatedText, 
        rawResponse: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('❌ Error in openrouter-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});