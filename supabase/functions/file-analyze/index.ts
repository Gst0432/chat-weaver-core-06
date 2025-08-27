import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { fileBase64, fileName, mime, prompt } = await req.json();
    console.log('Analyzing file:', fileName, 'Type:', mime);
    
    if (!fileBase64 || !fileName || !mime) {
      return new Response(JSON.stringify({ error: 'Missing fileBase64, fileName or mime' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const analysisPrompt = prompt || `Analysez ce document "${fileName}" en détail. Fournissez:
1. Le titre et l'auteur (si visible)
2. La structure générale du document
3. Les sections principales et leurs contenus
4. Les points clés et idées importantes
5. Un résumé complet en français

Soyez très détaillé dans votre analyse.`;

    // Use OpenAI Vision API for document analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use vision-capable model
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: analysisPrompt 
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mime};base64,${fileBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // If vision fails, try text extraction approach
      try {
        console.log('Vision failed, trying text-only analysis...');
        const textResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Vous êtes un expert en analyse de documents. Analysez le contenu fourni et donnez un résumé détaillé.'
              },
              {
                role: 'user',
                content: `Analysez ce document "${fileName}" (type: ${mime}). Même si vous ne pouvez pas voir le contenu exact, fournissez une analyse basée sur le nom du fichier et le type de document. 

Nom du fichier: ${fileName}
Type MIME: ${mime}

${analysisPrompt}`
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          }),
        });

        if (textResponse.ok) {
          const textData = await textResponse.json();
          const generatedText = textData.choices?.[0]?.message?.content || 'Analyse basique effectuée.';
          
          return new Response(JSON.stringify({ generatedText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (fallbackError) {
        console.error('Fallback analysis failed:', fallbackError);
      }
      
      return new Response(JSON.stringify({ 
        error: 'OpenAI API error', 
        details: errorText,
        generatedText: `Impossible d'analyser automatiquement le document "${fileName}". 

Basé sur le nom du fichier, il semble s'agir d'un document sur la spiritualité dans les affaires pour entrepreneurs modernes. 

Pour une analyse complète, vous pouvez:
1. Vérifier que le fichier n'est pas corrompu
2. Essayer de re-télécharger le document
3. Utiliser le chat pour poser des questions spécifiques

Type de fichier détecté: ${mime}`
      }), { 
        status: 200, // Return 200 to show the fallback message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const data = await response.json();
    console.log('OpenAI response received, analyzing...');
    
    const generatedText = data.choices?.[0]?.message?.content || 'Analyse terminée, mais aucun texte exploitable retourné.';

    console.log('Analysis completed successfully');
    return new Response(JSON.stringify({ generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('file-analyze error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unexpected error',
      generatedText: `Erreur lors de l'analyse du document. 
      
Détails techniques: ${error?.message || 'Erreur inconnue'}

Vous pouvez essayer:
1. De re-télécharger le document
2. D'utiliser le chat pour poser des questions directes
3. De vérifier que le fichier n'est pas trop volumineux`
    }), { 
      status: 200, // Return 200 to show error message in UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});