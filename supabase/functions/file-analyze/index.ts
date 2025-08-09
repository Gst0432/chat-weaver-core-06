import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { fileBase64, fileName, mime, prompt } = await req.json();
    if (!fileBase64 || !fileName || !mime) {
      return new Response(JSON.stringify({ error: 'Missing fileBase64, fileName or mime' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const bytes = base64ToUint8Array(fileBase64);
    const blob = new Blob([bytes], { type: mime });

    // 1) Upload file to OpenAI Files API
    const form = new FormData();
    form.append('file', blob, fileName);
    form.append('purpose', 'assistants');

    const uploadRes = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('OpenAI file upload error:', errText);
      return new Response(JSON.stringify({ error: 'OpenAI file upload error', details: errText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const uploaded = await uploadRes.json();
    const fileId = uploaded.id;

    // 2) Ask model to analyze the file via Responses API
    const analysisPrompt = prompt || 'Analyse ce document (structure, sections, tableaux/puces) puis produis un résumé clair en 10 points.';

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: analysisPrompt },
              { type: 'input_file', file_id: fileId },
            ]
          }
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('OpenAI responses error:', errText);
      return new Response(JSON.stringify({ error: 'OpenAI responses error', details: errText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await resp.json();
    const generatedText = data?.output_text
      || data?.content?.[0]?.text?.value
      || data?.choices?.[0]?.message?.content
      || 'Analyse terminée, mais aucun texte exploitable retourné.';

    return new Response(JSON.stringify({ generatedText }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('file-analyze error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});