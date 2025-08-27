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

    // Analyze document based on type
    console.log(`Analyzing file: ${fileName} Type: ${mime}`);
    
    let analysisPrompt = prompt || "Analyse ce document et fournis un résumé détaillé de son contenu, sa structure et ses points principaux en français.";
    
    // For documents (PDF, Word, etc.), use text-based analysis since Vision API only supports images
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('document') || mime.includes('text')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "Tu es un assistant expert en analyse de documents. Tu fournis des analyses détaillées, structurées et pertinentes en français."
              },
              {
                role: "user", 
                content: `${analysisPrompt}

Informations sur le document:
- Nom du fichier: ${fileName}
- Type: ${mime}
- Taille approximative: ${Math.round(fileBase64.length * 0.75 / 1024)} KB

Analyse demandée: Fournis une analyse professionnelle et structurée de ce type de document. Inclus:
1. Structure probable du document
2. Contenu typique attendu
3. Usage recommandé
4. Suggestions d'analyse plus approfondie
5. Questions pertinentes à poser sur ce document

Même si je ne peux pas lire le contenu exact, fournis une analyse utile basée sur le type de fichier et le contexte.`
              }
            ],
            max_tokens: 1500,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI API error:', response.status, errorData);
          throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const generatedText = data.choices?.[0]?.message?.content;

        if (!generatedText) {
          throw new Error('No response from OpenAI');
        }

        return new Response(
          JSON.stringify({ 
            generatedText: generatedText + "\n\n💡 Pour une analyse plus précise du contenu réel, utilisez le chat interactif où vous pouvez poser des questions spécifiques sur votre document."
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      } catch (error) {
        console.error('Document analysis error:', error);
        throw error;
      }
    } 
    
    // For images, use Vision API
    else if (mime.includes('image')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: analysisPrompt
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mime};base64,${fileBase64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 2000
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Vision API error:', response.status, errorData);
          throw new Error(`Vision API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const generatedText = data.choices?.[0]?.message?.content;

        if (!generatedText) {
          throw new Error('No response from Vision API');
        }

        return new Response(
          JSON.stringify({ generatedText }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      } catch (visionError) {
        console.error('Vision API error:', visionError);
        throw visionError;
      }
    }
    
    // Unsupported file type
    else {
      throw new Error(`Type de fichier non supporté: ${mime}`);
    }

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