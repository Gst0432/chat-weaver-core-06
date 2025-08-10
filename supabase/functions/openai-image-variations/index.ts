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
    const size = formData.get('size') as string || '1024x1024';
    const n = parseInt(formData.get('n') as string) || 2;
    const quality = formData.get('quality') as string || 'high';
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'Image is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Creating image variations, count:', n);

    // Préparer le FormData pour OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append('model', 'gpt-image-1');
    openAIFormData.append('size', size);
    openAIFormData.append('quality', quality);
    openAIFormData.append('n', n.toString());
    openAIFormData.append('image', imageFile);

    const response = await fetch('https://api.openai.com/v1/images/variations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI image variations error:', errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const imageUrls = data?.data?.map((img: any) => img.url);

    if (!imageUrls || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'No images returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully created ${imageUrls.length} variations`);

    // Télécharger toutes les images et les convertir en base64
    const imagePromises = imageUrls.map(async (imageUrl: string) => {
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
          return `data:${contentType};base64,${base64Image}`;
        } else {
          return imageUrl; // Fallback to URL
        }
      } catch (downloadError) {
        console.error('Failed to download image:', downloadError);
        return imageUrl; // Fallback to URL
      }
    });

    const images = await Promise.all(imagePromises);

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in openai-image-variations function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create image variations',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});