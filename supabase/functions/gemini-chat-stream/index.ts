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
    const { messages, model = 'gemini-1.5-flash', temperature = 0.7, max_tokens = 2000, stream = true } = await req.json();

    // Validate API key
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is not set')
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate model name
    const validModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
    const finalModel = validModels.includes(model) ? model : 'gemini-1.5-flash';
    
    if (finalModel !== model) {
      console.warn(`⚠️ Invalid model "${model}", using "${finalModel}" instead`);
    }

    console.log('🚀 Gemini streaming with model:', finalModel, 'stream:', stream);

    // Convert messages to Gemini format
    const contents = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = messages.find((m: any) => m.role === 'system')?.content;

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const endpoint = stream 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:streamGenerateContent?alt=sse&key=${apiKey}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;

    console.log('🔗 Calling endpoint:', endpoint.split('?')[0]);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Gemini response status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Gemini API error:', error);
      throw new Error(`Gemini API error (${response.status}): ${error}`);
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
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                        choices: [{
                          delta: { content: text }
                        }]
                      })}\n\n`));
                    }
                  } catch (e) {
                    console.warn('Error parsing Gemini stream chunk:', e);
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
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
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
    console.error('❌ Gemini streaming error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});