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
      console.error("OPENAI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model = "gpt-4.1-2025-04-14", temperature, max_tokens, max_completion_tokens } = await req.json();

    // Mapper GPT-5 vers GPT-4.1 en backend
    let actualModel = model;
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

    console.log(`Processing request for model: ${actualModel} (original: ${model})`);
    console.log(`Request parameters:`, { 
      model: actualModel,
      originalModel: model,
      temperature, 
      max_tokens, 
      max_completion_tokens, 
      messageCount: Array.isArray(messages) ? messages.length : 0 
    });

    // Détection correcte des modèles o1 (qui requièrent max_completion_tokens et interdisent temperature)
    const isO1Model = actualModel && (actualModel.includes('o1-preview') || actualModel.includes('o1-mini'));
    
    // Détection des modèles qui ne supportent PAS temperature (O3, O4)
    const isRestrictedModel = actualModel && (actualModel.startsWith('o3-') || 
                                       actualModel.startsWith('o4-'));
    
    // Détection des modèles modernes qui supportent temperature (GPT-4.1)
    const isModernModel = actualModel && actualModel.startsWith('gpt-4.1');
    
    const payload: any = {
      model: actualModel,
      messages: Array.isArray(messages) ? messages : [],
      stream: true,
    };

    // Configuration des paramètres selon le type de modèle
    if (isO1Model) {
      // Modèles o1 : max_completion_tokens uniquement, pas de temperature
      console.log("Using o1 model parameters");
      if (max_completion_tokens) payload.max_completion_tokens = max_completion_tokens;
      // Ne pas inclure temperature pour les modèles o1 (cause une erreur 400)
    } else if (isRestrictedModel) {
      // Modèles GPT-5, O3, O4 : max_completion_tokens mais PAS de temperature
      console.log("Using restricted model parameters (no temperature)");
      if (max_completion_tokens) payload.max_completion_tokens = max_completion_tokens;
      // Ne pas inclure temperature pour ces modèles (cause une erreur 400)
    } else if (isModernModel) {
      // Modèles GPT-4.1 : max_completion_tokens ET temperature
      console.log("Using modern model parameters");
      if (max_completion_tokens) payload.max_completion_tokens = max_completion_tokens;
      if (temperature !== undefined) payload.temperature = temperature;
    } else {
      // Modèles classiques : max_tokens et temperature
      console.log("Using legacy model parameters");
      if (temperature !== undefined) payload.temperature = temperature;
      if (max_tokens) payload.max_tokens = max_tokens;
    }

    console.log("Final payload to OpenAI:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      const errorStatus = response.status;
      
      console.error(`OpenAI API Error (${errorStatus}):`, errorText);
      console.error(`Failed request payload:`, JSON.stringify(payload, null, 2));
      
      let userFriendlyError = `OpenAI API Error (${errorStatus})`;
      
      // Messages d'erreur contextuels selon le modèle et l'erreur
      if (errorStatus === 400) {
        if (isO1Model && errorText.includes('temperature')) {
          userFriendlyError = `Erreur: Le modèle ${model} ne supporte pas le paramètre temperature`;
        } else if (errorText.includes('max_tokens') && isNewModel) {
          userFriendlyError = `Erreur: Le modèle ${model} nécessite max_completion_tokens au lieu de max_tokens`;
        } else if (errorText.includes('model')) {
          userFriendlyError = `Erreur: Modèle ${model} non valide ou indisponible`;
        } else {
          userFriendlyError = `Erreur de paramètres pour le modèle ${model}`;
        }
      } else if (errorStatus === 401) {
        userFriendlyError = "Erreur d'authentification OpenAI - Vérifiez votre clé API";
      } else if (errorStatus === 403) {
        userFriendlyError = `Accès refusé au modèle ${model}`;
      } else if (errorStatus === 429) {
        userFriendlyError = "Limite de taux dépassée - Veuillez réessayer dans quelques instants";
      } else if (errorStatus >= 500) {
        userFriendlyError = "Erreur serveur OpenAI - Veuillez réessayer";
      }
      
      return new Response(JSON.stringify({ 
        error: userFriendlyError,
        details: errorText,
        model: model
      }), {
        status: errorStatus || 500,
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