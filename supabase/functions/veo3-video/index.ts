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
    console.log("🎬 VEO3-VIDEO: Fonction appelée");
    
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

    // Préparer la requête pour l'API Veo 3
    const requestBody: any = {
      prompt,
      duration,
      quality,
      audio: true, // Générer l'audio natif
      resolution: quality === "high" ? "4K" : "1080p"
    };

    // Si une image est fournie, utiliser le mode image-to-video
    if (image) {
      requestBody.image = image;
      requestBody.mode = "image-to-video";
    } else {
      requestBody.mode = "text-to-video";
    }

    console.log("🚀 Appel API Veo 3 avec:", JSON.stringify(requestBody, null, 2));
    
    // Note: L'endpoint exact de Veo 3 peut varier, voici une structure générique
    // Vous devrez peut-être ajuster l'URL selon la documentation officielle
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3:generateVideo?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    console.log("📡 Réponse Veo 3 API:", response.status, response.statusText);

    if (!response.ok) {
      const err = await response.text();
      console.error("Veo 3 API error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // La structure de réponse peut varier, adaptez selon l'API
    const videoData = data?.video || data?.output || data;
    console.log("✅ Vidéo générée par Veo 3:", videoData ? "Succès" : "Échec");

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
    console.error("veo3-video error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});