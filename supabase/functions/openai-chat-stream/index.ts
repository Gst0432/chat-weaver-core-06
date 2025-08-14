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

    const { messages, model = "gpt-5-2025-08-07", temperature, max_tokens, max_completion_tokens } = await req.json();

    // Support nouveaux modèles OpenAI avec paramètres corrects
    const isNewModel = model && (model.startsWith('gpt-5') || model.startsWith('gpt-4.1') || 
                                model.startsWith('o3-') || model.startsWith('o4-'));
    
    const payload: any = {
      model,
      messages: Array.isArray(messages) ? messages : [],
      stream: true,
    };

    // Nouveaux modèles utilisent max_completion_tokens, anciens max_tokens
    if (isNewModel) {
      if (max_completion_tokens) payload.max_completion_tokens = max_completion_tokens;
      // Ne pas inclure temperature pour les nouveaux modèles (défaut 1.0)
    } else {
      if (temperature !== undefined) payload.temperature = temperature;
      if (max_tokens) payload.max_tokens = max_tokens;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: response.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Proxy the OpenAI SSE stream to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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