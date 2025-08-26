import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KlingVideoRequest {
  mode?: 'text-to-video' | 'image-to-video';
  prompt?: string;
  negative_prompt?: string;
  duration?: 5 | 10;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  image_url?: string;
  action?: 'check_status';
  task_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const klingApiKey = Deno.env.get('KLING_API_KEY');
    if (!klingApiKey) {
      throw new Error('KLING_API_KEY not configured');
    }

    const body: KlingVideoRequest = await req.json();
    console.log('KlingAI Official API Request:', body);

    // Handle status check
    if (body.action === 'check_status' && body.task_id) {
      const statusResponse = await fetch(`https://api.klingai.com/v1/videos/text2video/${body.task_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${klingApiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('KlingAI Status API Error:', errorText);
        throw new Error(`Erreur API KlingAI: ${statusResponse.status}`);
      }

      const statusResult = await statusResponse.json();
      console.log('KlingAI Status Response:', statusResult);

      return new Response(JSON.stringify({
        task_id: statusResult.id,
        status: statusResult.status,
        video_url: statusResult.status === 'succeed' ? statusResult.works?.[0]?.resource : null,
        estimated_time: statusResult.estimated_wait_time
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle video generation
    const { 
      mode = 'text-to-video', 
      prompt, 
      negative_prompt, 
      duration = 5, 
      aspect_ratio = '16:9',
      image_url 
    } = body;

    // Validation
    if (!prompt || prompt.length < 2 || prompt.length > 2500) {
      throw new Error('Le prompt doit contenir entre 2 et 2500 caractères');
    }

    if (negative_prompt && (negative_prompt.length < 2 || negative_prompt.length > 2500)) {
      throw new Error('Le prompt négatif doit contenir entre 2 et 2500 caractères');
    }

    if (![5, 10].includes(duration)) {
      throw new Error('La durée doit être 5 ou 10 secondes');
    }

    if (!['16:9', '9:16', '1:1'].includes(aspect_ratio)) {
      throw new Error('Le format doit être 16:9, 9:16 ou 1:1');
    }

    console.log('Using KlingAI Official API for video generation...');

    let requestPayload: any = {
      model: "kling-v1",
      prompt: prompt,
      duration: duration,
      aspect_ratio: aspect_ratio,
      professional_mode: false,
      callback_url: null
    };

    // Add negative prompt if provided
    if (negative_prompt) {
      requestPayload.negative_prompt = negative_prompt;
    }

    // Handle image-to-video mode
    if (mode === 'image-to-video') {
      if (!image_url) {
        throw new Error('Image requise pour le mode image-to-video');
      }
      requestPayload.image = image_url;
    }

    console.log('Sending request to KlingAI:', JSON.stringify(requestPayload, null, 2));

    // Determine endpoint based on mode
    const endpoint = mode === 'image-to-video' 
      ? 'https://api.klingai.com/v1/videos/image2video'
      : 'https://api.klingai.com/v1/videos/text2video';

    // Call KlingAI Official API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${klingApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('KlingAI API Error Response:', errorText);
      throw new Error(`Erreur API KlingAI: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('KlingAI API Response:', JSON.stringify(result, null, 2));

    // Check for errors in response
    if (result.error || result.code !== 0) {
      const errorMessage = result.message || result.error || 'Erreur inconnue';
      console.error('KlingAI API Error:', errorMessage);
      throw new Error(`Erreur génération vidéo: ${errorMessage}`);
    }

    if (!result.data || !result.data.task_id) {
      console.error('No task ID in response:', result);
      throw new Error('ID de tâche manquant dans la réponse');
    }

    const responseData = {
      task_id: result.data.task_id,
      status: 'pending',
      estimated_time: result.data.estimated_wait_time || 120,
      prompt: prompt,
      duration: duration,
      aspect_ratio: aspect_ratio,
      mode: mode
    };

    console.log('Returning task data:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in kling-official-video function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});