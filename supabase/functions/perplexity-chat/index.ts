import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model, temperature = 0.2, max_tokens = 1000 } = await req.json();

    const modelMap: Record<string, string> = {
      "llama-3.1-sonar-small-128k-online": "sonar-small-online",
      "llama-3.1-sonar-large-128k-online": "sonar-large-online",
      "llama-3.1-sonar-huge-128k-online": "sonar-huge-online",
    };
    const resolvedModel = modelMap[model] || model || "sonar-small-online";

    const payload = {
      model: resolvedModel,
      messages: Array.isArray(messages) ? messages : [],
      temperature,
      top_p: 0.9,
      max_tokens,
      return_images: false,
      return_related_questions: false,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
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
    console.error("perplexity-chat error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
