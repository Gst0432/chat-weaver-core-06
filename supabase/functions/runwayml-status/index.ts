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
    console.log("📋 RUNWAYML-STATUS: Fonction appelée");
    
    if (!RUNWAYML_API_KEY) {
      console.error("❌ RUNWAYML_API_KEY manquante");
      return new Response(JSON.stringify({ error: "RUNWAYML_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskId } = await req.json();
    console.log("📥 Vérification du statut pour la tâche:", taskId);

    if (!taskId) {
      return new Response(JSON.stringify({ error: "Task ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Appel API RunwayML pour statut tâche:", taskId);
    
    // Vérifier le statut de la tâche RunwayML
    const response = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${RUNWAYML_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("📡 Réponse RunwayML Status API:", response.status, response.statusText);

    if (!response.ok) {
      const err = await response.text();
      console.error("RunwayML Status API error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("📦 Statut de la tâche:", JSON.stringify(data, null, 2));
    
    // Analyser le statut de la tâche
    const status = data.status;
    const result = {
      taskId: taskId,
      status: status,
      progress: data.progress || 0
    };

    if (status === "SUCCEEDED" && data.output) {
      result.videoUrl = data.output[0];
      result.duration = data.metadata?.duration || 10;
      console.log("✅ Vidéo RunwayML générée avec succès:", result.videoUrl);
    } else if (status === "FAILED") {
      result.error = data.failure_reason || "Generation failed";
      console.error("❌ Échec de génération RunwayML:", result.error);
    } else {
      console.log("⏳ Génération en cours...", status, `${data.progress || 0}%`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("runwayml-status error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});