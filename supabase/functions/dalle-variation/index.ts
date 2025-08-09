import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function b64ToUint8Array(b64: string) {
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, prompt, size } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'Missing image data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let imageBlob: Blob | null = null;
    let filename = 'image.png';

    if (typeof image === 'string' && image.startsWith('data:')) {
      const mime = image.slice(5, image.indexOf(';')) || 'image/png';
      const base64 = image.split(',')[1] || '';
      const bytes = b64ToUint8Array(base64);
      imageBlob = new Blob([bytes], { type: mime });
      filename = `upload.${mime.split('/')[1] || 'png'}`;
    } else if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
      const resp = await fetch(image);
      if (!resp.ok) throw new Error(`Failed to fetch image URL: ${resp.status}`);
      const arrBuf = await resp.arrayBuffer();
      const contentType = resp.headers.get('content-type') || 'image/png';
      imageBlob = new Blob([arrBuf], { type: contentType });
      filename = `remote.${contentType.split('/')[1] || 'png'}`;
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported image format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = new FormData();
    formData.append('model', 'dall-e-2');
    formData.append('size', size || '1024x1024');
    formData.append('image', new File([imageBlob], filename, { type: imageBlob.type }));

    const endpoint = prompt ? 'https://api.openai.com/v1/images/edits' : 'https://api.openai.com/v1/images/variations';
    if (prompt) formData.append('prompt', String(prompt));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        // DO NOT set Content-Type here; the browser/fetch will set proper multipart boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('dalle-variation error:', errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const url = data?.data?.[0]?.url;
    const b64 = data?.data?.[0]?.b64_json;

    if (!url && !b64) {
      return new Response(JSON.stringify({ error: 'No image returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageOut = url ? url : `data:image/png;base64,${b64}`;

    return new Response(JSON.stringify({ image: imageOut }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in dalle-variation function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: String(error?.message || error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});