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
    const {
      text,
      languageCode = 'fr-FR',
      voiceName = '',
      ssmlGender = 'NEUTRAL',
      audioEncoding = 'MP3',
      speakingRate = 1.0,
    } = await req.json()

    if (!text || typeof text !== 'string') throw new Error('Text is required')

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not set')

    const payload: any = {
      input: { text },
      voice: { languageCode, ssmlGender },
      audioConfig: { audioEncoding, speakingRate },
    }
    if (voiceName) payload.voice.name = voiceName

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}` ,{
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Google TTS error: ${err}`)
    }

    const data = await response.json()
    const audio = data.audioContent as string
    const mime = audioEncoding === 'LINEAR16' ? 'audio/wav' : 'audio/mpeg'

    return new Response(
      JSON.stringify({ audio, mime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('google-tts error', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
