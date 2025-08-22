import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = {
  'fr': 'Français',
  'en': 'English', 
  'es': 'Español',
  'ar': 'العربية'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, sourceLang = 'auto', targetLang } = await req.json();

    if (!text) {
      throw new Error('Texte à traduire requis');
    }

    if (!targetLang || !SUPPORTED_LANGUAGES[targetLang as keyof typeof SUPPORTED_LANGUAGES]) {
      throw new Error('Langue cible non supportée');
    }

    console.log(`Translating from ${sourceLang} to ${targetLang}`);
    console.log('Text length:', text.length);

    // Use OpenAI for translation (more reliable than Google Translate for this use case)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('Clé API OpenAI manquante');
    }

    const systemPrompt = `You are a professional translator. Translate the following text to ${SUPPORTED_LANGUAGES[targetLang as keyof typeof SUPPORTED_LANGUAGES]} (${targetLang}). 
    
    Rules:
    - Maintain the original meaning and tone
    - Keep formatting (line breaks, punctuation)
    - For Arabic, ensure proper RTL text flow
    - For technical terms, provide accurate translations
    - Return ONLY the translated text, no explanations`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: Math.min(4000, text.length * 2),
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur de traduction OpenAI');
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content;

    console.log('Translation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        targetLanguageName: SUPPORTED_LANGUAGES[targetLang as keyof typeof SUPPORTED_LANGUAGES],
        wordCount: text.split(' ').length,
        translatedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur lors de la traduction' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});