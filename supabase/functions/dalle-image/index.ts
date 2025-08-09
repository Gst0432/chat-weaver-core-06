import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, size } = await req.json();

    // First try DALL·E 3 (URL response)
    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        size: size || '1024x1024',
        quality: 'standard',
        n: 1,
      }),
    });

    if (dalleRes.ok) {
      const data = await dalleRes.json();
      const url = data?.data?.[0]?.url;
      if (!url) {
        return new Response(JSON.stringify({ error: 'No image URL returned' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch the image bytes and return as base64 PNG data URL for easy download/display
      const imgResp = await fetch(url);
      if (!imgResp.ok) {
        const err = await imgResp.text();
        return new Response(JSON.stringify({ error: `Failed to fetch image: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const arrayBuffer = await imgResp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const dataUrl = `data:image/png;base64,${base64}`;

      return new Response(
        JSON.stringify({ image: dataUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If DALL·E failed, try gpt-image-1 (base64 response)
    const gptImgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: size || '1024x1024',
      }),
    });

    if (!gptImgRes.ok) {
      const errText = await gptImgRes.text();
      console.error('dalle-image fallback error:', errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: gptImgRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gptData = await gptImgRes.json();
    const b64 = gptData?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: 'No base64 image returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataUrl = `data:image/png;base64,${b64}`;
    return new Response(
      JSON.stringify({ image: dataUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in dalle-image function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: String(error?.message || error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
