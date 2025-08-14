import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RUNWAYML_API_KEY = Deno.env.get("RUNWAYML_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎬 RUNWAYML-VIDEO: Fonction appelée");
    
    if (!RUNWAYML_API_KEY) {
      console.error("❌ RUNWAYML_API_KEY manquante");
      return new Response(JSON.stringify({ error: "RUNWAYML_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, image, duration = 10, quality = "high" } = await req.json();
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

    // Préparer la requête pour l'API RunwayML
    const requestBody: any = {
      promptText: prompt,
      seed: Math.floor(Math.random() * 1000000),
      exploreMode: false
    };

    // Configuration pour image-to-video vs text-to-video
    if (image) {
      requestBody.promptImage = image;
      requestBody.model = "gen3a_turbo";
    } else {
      requestBody.seconds = duration;
      requestBody.ratio = quality === "high" ? "16:9" : "9:16";
    }

    console.log("🚀 Appel API RunwayML avec:", JSON.stringify(requestBody, null, 2));
    
    // Détermine le bon endpoint selon le type de génération
    const endpoint = image ? "/v1/image_to_video" : "/v1/generations";
    
    // Appel à l'API RunwayML Gen-3 Turbo
    const response = await fetch(`https://api.dev.runwayml.com${endpoint}`, {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${RUNWAYML_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify({
        ...requestBody,
        model: "gen3a_turbo"
      }),
    });
    
    console.log("📡 Réponse RunwayML API:", response.status, response.statusText);

    if (!response.ok) {
      const err = await response.text();
      console.error("RunwayML API error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("📦 Réponse brute RunwayML:", JSON.stringify(data, null, 2));
    
    // RunwayML retourne un task ID, on doit attendre que la vidéo soit générée
    if (data.id) {
      console.log("✅ Tâche RunwayML créée avec succès, ID:", data.id);
      
      return new Response(JSON.stringify({ 
        taskId: data.id,
        status: "processing",
        duration,
        quality,
        hasAudio: true,
        provider: "runwayml"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      console.error("❌ Aucun ID de tâche trouvé dans la réponse");
      return new Response(JSON.stringify({ 
        error: "No task ID found in response",
        raw: data 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("runwayml-video error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});