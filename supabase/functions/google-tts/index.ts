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

    console.log('🔊 Google TTS request:', { text: text?.substring(0, 50), languageCode, voiceName })

    if (!text || typeof text !== 'string') throw new Error('Text is required')

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
    if (!GOOGLE_API_KEY) {
      console.error('❌ GOOGLE_API_KEY is not set')
      throw new Error('GOOGLE_API_KEY is not set')
    }

    const payload: any = {
      input: { text },
      voice: { languageCode, ssmlGender },
      audioConfig: { audioEncoding, speakingRate },
    }
    if (voiceName) payload.voice.name = voiceName

    console.log('🚀 Calling Google TTS API with payload:', payload)
    
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log('📡 Google TTS response status:', response.status, response.statusText)

    if (!response.ok) {
      const err = await response.text()
      console.error('❌ Google TTS API error:', err)
      
      if (response.status === 403) {
        throw new Error(`Google TTS API access denied. Please check: 1) Text-to-Speech API is enabled in Google Cloud Console, 2) API key has proper permissions, 3) API key is valid. Error: ${err}`)
      }
      
      throw new Error(`Google TTS error (${response.status}): ${err}`)
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
