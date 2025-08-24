import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 GEMINI-CHAT: Fonction appelée");
    
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY manquante");
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model = "gemini-1.5-flash", temperature = 0.7, max_tokens = 800 } = await req.json();
    console.log("📥 Paramètres reçus:", { model, temperature, max_tokens, messagesCount: messages?.length });

    // Convert OpenAI format to Gemini format
    const contents = messages
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Handle system message separately
    const systemMessage = messages.find((msg: any) => msg.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    // Validate model name
    const validModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
    const finalModel = validModels.includes(model) ? model : 'gemini-1.5-flash';
    
    if (finalModel !== model) {
      console.warn(`⚠️ Invalid model "${model}", using "${finalModel}" instead`);
    }
    
    const payload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens,
        topP: 0.8,
        topK: 10
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    console.log("🚀 Appel API Gemini avec model:", finalModel);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    
    console.log("📡 Réponse Gemini API:", response.status, response.statusText);

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("✅ Texte généré par Gemini:", generatedText?.substring(0, 100) + "...");

    return new Response(JSON.stringify({ generatedText, raw: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gemini-chat error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});