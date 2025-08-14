import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎬 VEO2-VIDEO: Fonction appelée");
    
    if (!GOOGLE_API_KEY) {
      console.error("❌ GOOGLE_API_KEY manquante");
      return new Response(JSON.stringify({ error: "GOOGLE_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, image, duration = 8, quality = "high" } = await req.json();
    console.log("📥 Paramètres reçus:", { 
      prompt: prompt?.substring(0, 100) + "...", 
      hasImage: !!image, 
      duration, 
      quality 
    });

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Préparer la requête pour l'API Veo 2 au format Gemini standard
    const contents = [];
    
    // Ajouter le prompt de génération vidéo
    contents.push({
      parts: [{
        text: `Generate a ${duration}-second video with ${quality} quality: ${prompt}`
      }]
    });

    // Si une image est fournie pour image-to-video
    if (image) {
      contents[0].parts.push({
        inline_data: {
          mime_type: "image/jpeg", // ou le type MIME approprié
          data: image.replace(/^data:image\/[^;]+;base64,/, '') // Enlever le préfixe data URL si présent
        }
      });
    }

    const requestBody = {
      contents,
      generationConfig: {
        videoLength: `${duration}s`,
        includeAudio: true
      }
    };

    console.log("🚀 Appel API Veo 2 avec:", JSON.stringify(requestBody, null, 2));
    
    // Utiliser l'endpoint generateContent standard avec le modèle veo-2
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-2:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    console.log("📡 Réponse Veo 2 API:", response.status, response.statusText);

    if (!response.ok) {
      const err = await response.text();
      console.error("Veo 2 API error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("📦 Réponse brute Veo 2:", JSON.stringify(data, null, 2));
    
    // Parser la réponse au format Gemini standard
    const videoData = data?.candidates?.[0]?.content?.parts?.[0]?.videoData ||
                     data?.candidates?.[0]?.content?.parts?.[0]?.inlineData ||
                     data?.video || 
                     data?.output;
    
    if (!videoData) {
      console.error("❌ Aucune donnée vidéo trouvée dans la réponse");
      return new Response(JSON.stringify({ 
        error: "No video data found in response",
        raw: data 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Vidéo générée par Veo 2 avec succès");

    return new Response(JSON.stringify({ 
      video: videoData,
      duration,
      quality,
      hasAudio: true,
      raw: data 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("veo2-video error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});