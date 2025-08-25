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
    const { generation_id, action = 'resume' } = await req.json();

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

    // Get generation details
    const { data: generation, error: genError } = await supabase
      .from('ebook_generations')
      .select('*')
      .eq('id', generation_id)
      .eq('user_id', user.id)
      .single();

    if (genError || !generation) {
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (action === 'get_partial_content') {
      // Get partial content from saved chapters
      const { data: partialContent, error: contentError } = await supabase
        .rpc('get_partial_ebook_content', { generation_id_param: generation_id });

      if (contentError) {
        console.error('❌ Error getting partial content:', contentError);
        return new Response(
          JSON.stringify({ error: 'Failed to get partial content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Get chapter count
      const { data: chapters, error: chaptersError } = await supabase
        .from('ebook_chapters')
        .select('id, chapter_number, chapter_title, word_count, chapter_type')
        .eq('generation_id', generation_id)
        .order('chapter_number');

      return new Response(
        JSON.stringify({ 
          content: partialContent,
          chapters: chapters || [],
          generation: generation,
          has_content: (partialContent?.length || 0) > 100
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save_partial_ebook') {
      // Save current partial content as a complete ebook
      const { data: partialContent } = await supabase
        .rpc('get_partial_ebook_content', { generation_id_param: generation_id });

      if (!partialContent || partialContent.length < 100) {
        return new Response(
          JSON.stringify({ error: 'No partial content to save' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Create ebook with partial content
      const { data: ebook, error: ebookError } = await supabase
        .from('ebooks')
        .insert({
          user_id: user.id,
          title: `${generation.title} (Partiel)`,
          author: generation.author,
          content_markdown: partialContent
        })
        .select()
        .single();

      if (ebookError) {
        return new Response(
          JSON.stringify({ error: 'Failed to save partial ebook' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ 
          message: 'Partial ebook saved successfully',
          ebook_id: ebook.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'resume') {
      // Resume generation by calling the main function
      const resumeResponse = await supabase.functions.invoke('generate-ebook', {
        body: {
          title: generation.title,
          author: generation.author,
          prompt: generation.prompt,
          model: generation.model,
          template: generation.template,
          useAI: true,
          resume_generation_id: generation_id
        },
        headers: {
          Authorization: req.headers.get('Authorization')!
        }
      });

      return new Response(
        JSON.stringify({ 
          message: 'Generation resumed',
          generation_id: generation_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('❌ Error in resume-ebook-generation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});