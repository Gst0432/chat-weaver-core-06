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

    // Use gpt-image-1 which returns base64 by default
    const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: size || '1024x1024',
        n: 1,
      }),
    });

    if (!imgRes.ok) {
      const errText = await imgRes.text();
      console.error('dalle-image error:', errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: imgRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await imgRes.json();
    const b64 = data?.data?.[0]?.b64_json;
    let dataUrl: string | null = null;

    if (b64) {
      dataUrl = `data:image/png;base64,${b64}`;
    } else if (data?.data?.[0]?.url) {
      // Rare case: if a URL is returned, fetch and convert to base64 PNG
      const imgResp = await fetch(data.data[0].url);
      if (!imgResp.ok) {
        const err = await imgResp.text();
        return new Response(JSON.stringify({ error: `Failed to fetch image: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const arrayBuffer = await imgResp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      dataUrl = `data:image/png;base64,${base64}`;
    }

    if (!dataUrl) {
      return new Response(JSON.stringify({ error: 'No image returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
