import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      text,
      model = 'openai/tts-1',
      voice = 'alloy',
      format = 'mp3',
      speed = 1.0
    } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Map voice names for different providers
    const voiceMapping: Record<string, Record<string, string>> = {
      'openai/tts-1': {
        'alloy': 'alloy',
        'echo': 'echo',
        'fable': 'fable',
        'onyx': 'onyx',
        'nova': 'nova',
        'shimmer': 'shimmer'
      },
      'openai/tts-1-hd': {
        'alloy': 'alloy',
        'echo': 'echo',
        'fable': 'fable',
        'onyx': 'onyx',
        'nova': 'nova',
        'shimmer': 'shimmer'
      }
    };

    const mappedVoice = voiceMapping[model]?.[voice] || voice;

    console.log(`Generating TTS with OpenRouter: ${model}, voice: ${mappedVoice}`);

    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://chatelix.com',
        'X-Title': 'ChatElix TTS'
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: mappedVoice,
        response_format: format,
        speed
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter TTS error:', errorText);
      throw new Error(`OpenRouter TTS error: ${errorText}`);
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        mime: mimeType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('OpenRouter TTS error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});