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
      prompt, 
      title, 
      author, 
      format = 'markdown',
      useAI = true,
      model = 'gpt-4.1-2025-04-14',
      chapters = []
    } = await req.json();

    console.log('📚 Generating ebook:', { title, format, useAI, chaptersCount: chapters.length });

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

    let content = '';

    // Generate content with AI if requested
    if (useAI && prompt) {
      const aiPrompt = `Create a complete ebook with the following requirements:
Title: ${title}
Author: ${author}
Topic: ${prompt}

Structure the content as a professional ebook with:
- Introduction
- Multiple chapters (5-8 chapters)
- Conclusion
- Use markdown formatting for headers, lists, and emphasis
- Each chapter should be substantial (500-800 words)
- Include practical examples and actionable insights
- Professional tone suitable for publication

Generate the full content in markdown format:`;

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a professional ebook writer who creates high-quality, structured content.' },
            { role: 'user', content: aiPrompt }
          ],
          max_completion_tokens: 8000,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        content = aiData.choices[0].message.content;
      } else {
        console.error('AI generation failed:', await aiResponse.text());
        content = `# ${title}\n\nBy ${author}\n\n## Introduction\n\n${prompt}\n\n## Chapter 1\n\nContent to be developed...`;
      }
    } else if (chapters.length > 0) {
      // Use provided chapters
      content = `# ${title}\n\nBy ${author}\n\n`;
      chapters.forEach((chapter: any, index: number) => {
        content += `## Chapter ${index + 1}: ${chapter.title}\n\n${chapter.content}\n\n`;
      });
    } else {
      content = `# ${title}\n\nBy ${author}\n\n## Introduction\n\n${prompt || 'Content to be developed...'}`;
    }

    // Generate different formats
    let generatedContent = content;
    let mimeType = 'text/markdown';
    let fileExtension = 'md';

    if (format === 'html') {
      generatedContent = convertMarkdownToHTML(content, title, author);
      mimeType = 'text/html';
      fileExtension = 'html';
    } else if (format === 'epub') {
      // For EPUB, we'll return the content and let the client handle the conversion
      // since epub-gen requires browser environment
      generatedContent = content;
      mimeType = 'application/epub+zip';
      fileExtension = 'epub';
    }

    // Save to database
    const { data: ebook, error: dbError } = await supabase
      .from('ebooks')
      .insert({
        user_id: user.id,
        title,
        author,
        content_markdown: content
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save ebook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        ebook,
        content: generatedContent,
        format,
        mimeType,
        fileExtension
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Ebook generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function convertMarkdownToHTML(markdown: string, title: string, author: string): string {
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u])/gm, '<p>')
    .replace(/$/gm, '</p>');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; }
        h1 { color: #2563eb; border-bottom: 3px solid #e5e7eb; padding-bottom: 1rem; }
        h2 { color: #1e40af; margin-top: 2rem; }
        h3 { color: #3730a3; }
        p { margin-bottom: 1rem; text-align: justify; }
        .author { text-align: center; font-style: italic; color: #6b7280; margin-bottom: 3rem; }
    </style>
</head>
<body>
    <div class="author">Par ${author}</div>
    ${html}
</body>
</html>`;
}