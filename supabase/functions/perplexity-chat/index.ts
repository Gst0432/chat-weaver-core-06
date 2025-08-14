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
    console.log("🔍 PERPLEXITY-CHAT: Fonction appelée");
    
    if (!PERPLEXITY_API_KEY) {
      console.error("❌ PERPLEXITY_API_KEY manquante");
      return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestData = await req.json();
    console.log("📥 Données brutes reçues:", requestData);
    
    const { messages, model, temperature = 0.2, max_tokens = 1000 } = requestData;
    
    // Validation stricte des paramètres
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error("❌ Messages invalides:", messages);
      return new Response(JSON.stringify({ error: "Messages array is required and cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      console.error("❌ Temperature invalide:", temperature);
      return new Response(JSON.stringify({ error: "Temperature must be a number between 0 and 2" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 4096) {
      console.error("❌ max_tokens invalide:", max_tokens);
      return new Response(JSON.stringify({ error: "max_tokens must be a number between 1 and 4096" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("✅ Paramètres validés:", { model, temperature, max_tokens, messagesCount: messages.length });

    const modelMap: Record<string, string> = {
      "llama-3.1-sonar-small-128k-online": "llama-3.1-sonar-small-128k-online",
      "llama-3.1-sonar-large-128k-online": "llama-3.1-sonar-large-128k-online", 
      "llama-3.1-sonar-huge-128k-online": "llama-3.1-sonar-huge-128k-online",
      "perplexity": "llama-3.1-sonar-small-128k-online", // Fallback pour ID simple
    };
    const resolvedModel = modelMap[model] || model || "llama-3.1-sonar-small-128k-online";
    console.log("🔄 Modèle mappé:", model, "->", resolvedModel);

    // Nettoyage des messages - s'assurer qu'ils sont au bon format
    const cleanMessages = messages.filter((msg: any) => 
      msg && typeof msg === 'object' && 
      ['user', 'assistant', 'system'].includes(msg.role) &&
      typeof msg.content === 'string' && 
      msg.content.trim().length > 0
    );

    if (cleanMessages.length === 0) {
      console.error("❌ Aucun message valide après nettoyage");
      return new Response(JSON.stringify({ error: "No valid messages found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payload strictement compatible avec l'API Perplexity
    const payload = {
      model: resolvedModel,
      messages: cleanMessages,
      temperature: Math.min(Math.max(temperature, 0), 2), // Clamp entre 0 et 2
      max_tokens: Math.min(Math.max(max_tokens, 1), 4096), // Clamp entre 1 et 4096
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    console.log("🚀 Appel API Perplexity avec payload validé:", {
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      messagesCount: payload.messages.length,
      firstMessage: payload.messages[0]?.content?.substring(0, 100) + "..."
    });

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Réponse Perplexity API:", response.status, response.statusText);

    if (!response.ok) {
      const errText = await response.text();
      let parsedError = errText;
      
      try {
        const errorJson = JSON.parse(errText);
        parsedError = errorJson;
        console.error("❌ Erreur JSON Perplexity API:", {
          status: response.status,
          statusText: response.statusText,
          errorDetails: errorJson,
          model: resolvedModel,
          messagesCount: cleanMessages.length,
          sentPayload: {
            model: payload.model,
            temperature: payload.temperature,
            max_tokens: payload.max_tokens
          }
        });
      } catch {
        console.error("❌ Erreur texte Perplexity API:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errText,
          model: resolvedModel,
          messagesCount: cleanMessages.length
        });
      }
      
      return new Response(JSON.stringify({ 
        error: parsedError,
        debug: {
          status: response.status,
          model: resolvedModel,
          messagesCount: cleanMessages.length
        }
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content ?? "";
    console.log("✅ Texte généré par Perplexity:", generatedText?.substring(0, 100) + "...");

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
