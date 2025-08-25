import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoGenerationRequest {
  mode: 'text-to-video' | 'image-to-video';
  positivePrompt: string;
  negativePrompt?: string;
  duration: 5 | 10;
  width: 1920 | 1080;
  height: 1080 | 1920;
  inputImage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const runwareApiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!runwareApiKey) {
      throw new Error('RUNWARE_API_KEY not configured');
    }

    const body: VideoGenerationRequest = await req.json();
    console.log('KlingAI Video Generation Request:', body);

    const { 
      mode, 
      positivePrompt, 
      negativePrompt, 
      duration, 
      width, 
      height, 
      inputImage 
    } = body;

    // Validation
    if (!positivePrompt || positivePrompt.length < 2 || positivePrompt.length > 2500) {
      throw new Error('Le prompt positif doit contenir entre 2 et 2500 caractères');
    }

    if (negativePrompt && (negativePrompt.length < 2 || negativePrompt.length > 2500)) {
      throw new Error('Le prompt négatif doit contenir entre 2 et 2500 caractères');
    }

    if (![5, 10].includes(duration)) {
      throw new Error('La durée doit être 5 ou 10 secondes');
    }

    // Generate unique task UUID
    const taskUUID = crypto.randomUUID();

    // Prepare authentication request
    const authRequest = {
      taskType: "authentication",
      apiKey: runwareApiKey
    };

    let videoRequest: any = {
      taskType: "videoInference",
      taskUUID: taskUUID,
      model: "klingai:5@3",
      positivePrompt: positivePrompt,
      duration: duration,
      width: width,
      height: height
    };

    // Add negative prompt if provided
    if (negativePrompt) {
      videoRequest.negativePrompt = negativePrompt;
    }

    // Handle image-to-video mode
    if (mode === 'image-to-video') {
      if (!inputImage) {
        throw new Error('Image requise pour le mode image-to-video');
      }

      // For image-to-video, we need to use frameImages
      videoRequest.frameImages = [
        {
          inputImage: inputImage,
          frame: "first"
        }
      ];
    }

    // Prepare full request payload
    const requestPayload = [authRequest, videoRequest];

    console.log('Sending request to Runware:', JSON.stringify(requestPayload, null, 2));

    // Call Runware API
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runware API Error Response:', errorText);
      throw new Error(`Erreur API Runware: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Runware API Response:', JSON.stringify(result, null, 2));

    // Check for errors in response
    if (result.error || result.errors) {
      const errorMessage = result.errorMessage || result.errors?.[0]?.message || 'Erreur inconnue';
      console.error('Runware API Error:', errorMessage);
      throw new Error(`Erreur génération vidéo: ${errorMessage}`);
    }

    // Extract video data from response
    const videoData = result.data?.find((item: any) => item.taskType === 'videoInference');
    
    if (!videoData) {
      console.error('No video data in response:', result);
      throw new Error('Aucune données vidéo dans la réponse de l\'API');
    }

    if (!videoData.videoURL) {
      console.error('No video URL in response:', videoData);
      throw new Error('URL vidéo manquante dans la réponse');
    }

    const responseData = {
      taskUUID: videoData.taskUUID,
      videoURL: videoData.videoURL,
      positivePrompt: videoData.positivePrompt,
      duration: videoData.duration || duration,
      width: videoData.width || width,
      height: videoData.height || height,
      model: 'klingai:5@3',
      mode: mode
    };

    console.log('Returning video data:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in klingai-video function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});