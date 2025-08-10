import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const size = formData.get('size') as string || '1024x1024';
    const quality = formData.get('quality') as string || 'high';
    const imageFile = formData.get('image') as File;
    const maskFile = formData.get('mask') as File;

    if (!prompt || !imageFile) {
      return new Response(JSON.stringify({ error: 'Prompt and image are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Editing image with prompt:', prompt);

    // Préparer le FormData pour OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append('model', 'gpt-image-1');
    openAIFormData.append('prompt', prompt);
    openAIFormData.append('size', size);
    openAIFormData.append('quality', quality);
    openAIFormData.append('image', imageFile);
    
    if (maskFile) {
      openAIFormData.append('mask', maskFile);
    }

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI image edit error:', errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'No image returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Image successfully edited');

    // Télécharger l'image et la convertir en base64
    try {
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        
        const bytes = new Uint8Array(imageBuffer);
        let binaryString = '';
        const chunkSize = 8192;
        
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64Image = btoa(binaryString);
        const base64DataUrl = `data:${contentType};base64,${base64Image}`;

        return new Response(JSON.stringify({ image: base64DataUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // Si le téléchargement échoue, retourner l'URL
        return new Response(JSON.stringify({ url: imageUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (downloadError) {
      console.error('Failed to download image:', downloadError);
      return new Response(JSON.stringify({ url: imageUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Error in openai-image-edit function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to edit image',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});