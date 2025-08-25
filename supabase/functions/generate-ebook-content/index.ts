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
      language = 'fr',
      format = 'markdown',
      useAI = true,
      model = 'gpt-4.1-2025-04-14',
      chapters = [],
      template = 'business',
      includeCover = true,
      includeAbout = true,
      includeToc = true
    } = await req.json();

    console.log('📚 Generating ebook content:', { title, language, format, useAI, chaptersCount: chapters.length, includeCover, includeAbout, includeToc });

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
      const languageInstructions = {
        'fr': 'Écris en français avec un style professionnel et engageant.',
        'en': 'Write in English with a professional and engaging style.',
        'es': 'Escribe en español con un estilo profesional y atractivo.',
        'de': 'Schreibe auf Deutsch mit einem professionellen und ansprechenden Stil.',
        'it': 'Scrivi in italiano con uno stile professionale e coinvolgente.',
        'pt': 'Escreva em português com um estilo profissional e envolvente.',
        'ar': 'اكتب باللغة العربية مع أسلوب مهني وجذاب.',
        'zh': '用中文写作，风格专业且引人入胜。'
      };

      const aiPrompt = `Create a comprehensive ebook with the following requirements:
Title: ${title}
Author: ${author}
Topic: ${prompt}
Language: ${language}

CRITICAL REQUIREMENTS:
- MINIMUM 15,000 words total
- 15-20 detailed chapters
- Each chapter should be 750-1000 words minimum
- ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['fr']}

Structure the content as a complete ebook with:
- Detailed Introduction (800+ words)
- 15-20 substantial chapters (750-1000 words each)
- Comprehensive Conclusion (500+ words)
- Use markdown formatting for headers, lists, and emphasis
- Include practical examples, case studies, and actionable insights
- Add detailed explanations and elaborative content
- Ensure each section is thoroughly developed

Template style: ${template || 'business'}

Generate the COMPLETE FULL-LENGTH content in markdown format. Do not summarize or abbreviate - provide the complete detailed content:`;

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
          max_completion_tokens: 16000,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        let generatedContent = aiData.choices[0].message.content;
        
        // Generate additional pages if requested
        let coverPage = '';
        let aboutPage = '';
        let tocPage = '';
        
        if (includeCover) {
          const coverPrompt = `Create a professional book cover page in markdown format for the ebook "${title}" by ${author}. Include:
- Title prominently displayed
- Author name
- Brief compelling subtitle or tagline
- Professional formatting
- Language: ${language}
- Template style: ${template}`;

          const coverResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a professional book designer who creates elegant cover pages.' },
                { role: 'user', content: coverPrompt }
              ],
              max_completion_tokens: 1000,
            }),
          });

          if (coverResponse.ok) {
            const coverData = await coverResponse.json();
            coverPage = coverData.choices[0].message.content;
          }
        }

        if (includeAbout) {
          const aboutPrompt = `Create an "About the Author" page in markdown format for ${author}, author of "${title}". Include:
- Professional biography
- Expertise and background
- Why they wrote this book
- Contact information (placeholder)
- Language: ${language}
- Keep it professional and credible`;

          const aboutResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a professional writer who creates compelling author biographies.' },
                { role: 'user', content: aboutPrompt }
              ],
              max_completion_tokens: 1000,
            }),
          });

          if (aboutResponse.ok) {
            const aboutData = await aboutResponse.json();
            aboutPage = aboutData.choices[0].message.content;
          }
        }

        if (includeToc) {
          // Extract chapter titles from the generated content
          const chapterMatches = generatedContent.match(/^#{1,2}\s+(.+)$/gm) || [];
          const chapters = chapterMatches
            .filter(match => !match.toLowerCase().includes('introduction') && !match.toLowerCase().includes('conclusion'))
            .map((match, index) => {
              const title = match.replace(/^#{1,2}\s+/, '');
              return `${index + 1}. ${title}`;
            });

          const tocContent = language === 'fr' ? 'Table des Matières' : 
                           language === 'en' ? 'Table of Contents' :
                           language === 'es' ? 'Índice' :
                           language === 'de' ? 'Inhaltsverzeichnis' :
                           language === 'it' ? 'Indice' :
                           language === 'pt' ? 'Índice' :
                           language === 'ar' ? 'جدول المحتويات' :
                           language === 'zh' ? '目录' : 'Table des Matières';

          tocPage = `# ${tocContent}\n\n${chapters.join('\n\n')}\n\n---\n\n`;
        }
        
        // Combine all content
        content = '';
        if (coverPage) content += coverPage + '\n\n---\n\n';
        if (tocPage) content += tocPage + '\n\n';
        if (aboutPage) content += aboutPage + '\n\n---\n\n';
        content += generatedContent;
        
        // Validate minimum word count
        const wordCount = content.split(/\s+/).length;
        console.log(`📊 Generated content: ${wordCount} words`);
        
        if (wordCount < 15000) {
          console.warn(`⚠️ Content too short: ${wordCount} words. Extending...`);
          // Try to extend content with additional prompt
          const extendPrompt = `The following ebook content has ${wordCount} words but needs to reach at least 15,000 words. Please expand each chapter significantly with more detailed explanations, examples, case studies, and practical applications. Add more chapters if needed to reach the minimum word count:

${content}

Please provide the expanded version with much more detailed content:`;

          const extendResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a professional ebook writer who creates comprehensive, detailed content.' },
                { role: 'user', content: extendPrompt }
              ],
              max_completion_tokens: 16000,
            }),
          });

          if (extendResponse.ok) {
            const extendData = await extendResponse.json();
            content = extendData.choices[0].message.content;
            const finalWordCount = content.split(/\s+/).length;
            console.log(`📊 Extended content: ${finalWordCount} words`);
          }
        }
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
      generatedContent = content;
      mimeType = 'application/epub+zip';
      fileExtension = 'epub';
    }

    // Save to database WITHOUT cover image
    const { data: ebook, error: dbError } = await supabase
      .from('ebooks')
      .insert({
        user_id: user.id,
        title,
        author,
        content_markdown: content,
        cover_image_url: null // Will be updated later if cover is generated
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
        fileExtension,
        phase: 'content_complete'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Ebook content generation error:', error);
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