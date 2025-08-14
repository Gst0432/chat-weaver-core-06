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

    // Préparer la requête pour l'API RunwayML Gen-3
    const requestBody: any = {
      model: "gen3a_turbo",
      prompt: prompt,
      duration: duration,
      aspect_ratio: quality === "high" ? "16:9" : "9:16",
      seed: Math.floor(Math.random() * 1000000)
    };

    // Ajouter l'image si c'est une génération image-to-video
    if (image) {
      requestBody.image = image;
    }

    console.log("🚀 Appel API RunwayML avec:", JSON.stringify(requestBody, null, 2));
    
    // Utiliser le bon endpoint RunwayML Gen-3
    const response = await fetch(`https://api.runwayml.com/v1/image_to_video`, {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${RUNWAYML_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
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
    
    // RunwayML retourne un task ID
    const taskId = data.id || data.task_id || data.taskId;
    if (taskId) {
      console.log("✅ Tâche RunwayML créée avec succès, ID:", taskId);
      
      return new Response(JSON.stringify({ 
        taskId: taskId,
        status: "processing",
        duration,
        quality,
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