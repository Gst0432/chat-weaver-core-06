import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!DEEPSEEK_API_KEY) {
      console.error("❌ DEEPSEEK_API_KEY is not set")
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model, temperature = 0.7, max_tokens = 800 } = await req.json();
    
    console.log('🤖 DeepSeek request:', { model, temperature, max_tokens, messagesCount: messages?.length });

    const payload = {
      model: model || "deepseek-chat",
      messages: Array.isArray(messages) ? messages : [],
      temperature,
      max_tokens,
    };

    console.log('🚀 Calling DeepSeek API with model:', payload.model)

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log('📡 DeepSeek response status:', response.status, response.statusText)

    if (!response.ok) {
      const err = await response.text();
      console.error('❌ DeepSeek API error:', err)
      return new Response(JSON.stringify({ error: `DeepSeek API error (${response.status}): ${err}` }), {
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
    console.error("deepseek-chat error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
