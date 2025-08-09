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
    const { text, voice = 'alloy', format = 'mp3' } = await req.json()

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required')
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: format.toLowerCase() === 'wav' ? 'wav' : 'mp3',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenAI TTS error: ${err}`)
    }

    const buf = new Uint8Array(await response.arrayBuffer())
    // Encode base64 in chunks to avoid call stack overflow
    let binary = ''
    const CHUNK = 0x8000
    for (let i = 0; i < buf.length; i += CHUNK) {
      const chunk = buf.subarray(i, Math.min(i + CHUNK, buf.length))
      binary += String.fromCharCode(...chunk)
    }
    const base64Audio = btoa(binary)
    const mime = format.toLowerCase() === 'wav' ? 'audio/wav' : 'audio/mpeg'

    return new Response(
      JSON.stringify({ audio: base64Audio, mime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('text-to-voice error', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
