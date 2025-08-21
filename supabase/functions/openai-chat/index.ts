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

    // Mapper GPT-5 vers GPT-4.1 en backend
    let actualModel = model || "gpt-4.1-2025-04-14";
    if (model && model.startsWith('gpt-5')) {
      if (model.includes('mini')) {
        actualModel = "gpt-4.1-mini-2025-04-14";
      } else if (model.includes('nano')) {
        actualModel = "gpt-4.1-mini-2025-04-14"; // Utiliser mini pour nano aussi
      } else {
        actualModel = "gpt-4.1-2025-04-14"; // GPT-5 standard -> GPT-4.1
      }
      console.log(`🔄 Mapping ${model} -> ${actualModel}`);
    }

    // Support nouveaux modèles OpenAI (GPT-4.1, O3, etc.)
    const isNewModel = actualModel && (actualModel.startsWith('gpt-4.1') || 
                                actualModel.startsWith('o3-') || actualModel.startsWith('o4-'));
    
    const payload: any = {
      model: actualModel,
      messages: Array.isArray(messages) ? messages : [],
    };

    // Nouveaux modèles utilisent max_completion_tokens, anciens max_tokens
    if (isNewModel) {
      if (max_completion_tokens) payload.max_completion_tokens = max_completion_tokens;
      // Temperature par défaut 1.0 pour nouveaux modèles
    } else {
      if (temperature !== undefined) payload.temperature = temperature;
      if (max_tokens) payload.max_tokens = max_tokens;
    }

    console.log(`🤖 Model: ${actualModel}, Payload:`, JSON.stringify(payload, null, 2));

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

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ generatedText, raw: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("openai-chat error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
