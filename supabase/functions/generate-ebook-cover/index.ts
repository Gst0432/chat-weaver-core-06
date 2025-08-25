import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ebookId,
      coverImagePrompt,
      title,
      author
    } = await req.json();

    console.log('🎨 Generating cover image for ebook:', ebookId, 'with prompt:', coverImagePrompt);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify ebook exists and belongs to user
    const { data: ebook, error: ebookError } = await supabase
      .from('ebooks')
      .select('id, title, author')
      .eq('id', ebookId)
      .eq('user_id', user.id)
      .single();

    if (ebookError || !ebook) {
      return new Response(
        JSON.stringify({ error: 'Ebook not found or access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let coverImageUrl = null;

    // Generate cover image if prompt provided
    if (coverImagePrompt) {
      try {
        console.log('🎨 Generating cover image with prompt:', coverImagePrompt);
        
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: `Professional book cover illustration: ${coverImagePrompt}. High quality book cover design, vertical format, elegant typography space, title: "${title || ebook.title}", author: "${author || ebook.author}"`,
            size: '1024x1792',
            quality: 'hd'
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const imageUrl = imageData.data[0].url;
          
          // Download and upload to Supabase Storage
          const imageBytes = await fetch(imageUrl);
          const imageBlob = await imageBytes.blob();
          const filename = `cover-${ebookId}-${Date.now()}.png`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filename, imageBlob, { contentType: 'image/png' });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(filename);
            
            coverImageUrl = publicUrl;
            console.log('✅ Cover image uploaded:', coverImageUrl);

            // Update ebook with cover image URL
            const { error: updateError } = await supabase
              .from('ebooks')
              .update({ cover_image_url: coverImageUrl })
              .eq('id', ebookId)
              .eq('user_id', user.id);

            if (updateError) {
              console.error('Failed to update ebook with cover image:', updateError);
              throw new Error('Failed to update ebook with cover image');
            }

            console.log('✅ Ebook updated with cover image');
          } else {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
        } else {
          const errorText = await imageResponse.text();
          throw new Error(`Image generation failed: ${errorText}`);
        }
      } catch (error) {
        console.error('Failed to generate cover image:', error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        coverImageUrl,
        ebookId,
        phase: 'cover_complete'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Cover image generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});