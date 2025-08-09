import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, languageCode = 'fr-FR', sampleRateHertz = 48000 } = await req.json()
    if (!audio) throw new Error('No audio data provided')

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not set')

    const payload = {
      audio: { content: audio },
      config: {
        encoding: 'WEBM_OPUS',
        languageCode,
        sampleRateHertz,
        enableAutomaticPunctuation: true,
      },
    }

    const response = await fetch(`https://speech.googleapis.com/v1p1beta1/speech:recognize?key=${GOOGLE_API_KEY}` ,{
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Google STT error: ${err}`)
    }

    const data = await response.json()
    const text = (data.results || [])
      .flatMap((r: any) => r.alternatives?.[0]?.transcript ? [r.alternatives[0].transcript] : [])
      .join('\n')
      .trim()

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('google-stt error', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'STT failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
