import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model, temperature, max_tokens, max_completion_tokens } = await req.json();

    // Mapper GPT-5 vers GPT-4.1 en backend (garder mapping)
    let actualModel = model || "gpt-4.1-2025-04-14";
    if (model && model.startsWith('gpt-5')) {
      if (model.includes('mini')) {
        actualModel = "gpt-4.1-mini-2025-04-14";
      } else if (model.includes('nano')) {
        actualModel = "gpt-4.1-mini-2025-04-14";
      } else {
        actualModel = "gpt-4.1-2025-04-14";
      }
      console.log(`🔄 Streaming mapping ${model} -> ${actualModel}`);
    }

    // Support nouveaux modèles OpenAI
    const isNewModel = actualModel && (actualModel.startsWith('gpt-4.1') || 
                                actualModel.startsWith('o3-') || actualModel.startsWith('o4-'));
    
    const payload: any = {
      model: actualModel,
      messages: Array.isArray(messages) ? messages : [],
      stream: true, // Activer le streaming
    };

    // Paramètres selon le modèle
    if (isNewModel) {
      if (max_completion_tokens) payload.max_completion_tokens = max_completion_tokens;
    } else {
      if (temperature !== undefined) payload.temperature = temperature;
      if (max_tokens) payload.max_tokens = max_tokens;
    }

    console.log(`🌊 Streaming avec ${actualModel}`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Créer un stream de réponse
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Ignorer les erreurs de parsing
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("openai-chat-stream error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});