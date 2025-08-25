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

// Helper functions for AI calls
function isOpenRouterModel(model: string): boolean {
  return model.includes('/') || 
         model.includes('llama') || 
         model.includes('grok') || 
         model.includes('deepseek') || 
         model.includes('gemini') || 
         model.includes('claude');
}

async function callAI(prompt: string, model: string, useOpenRouter: boolean): Promise<any> {
  if (useOpenRouter) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://chatelix.com',
        'X-Title': 'Chatelix Ebook Generator'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a professional ebook writer who creates high-quality, structured content.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error:', errorText);
      
      if (response.status === 401) {
        throw new Error('Clé API OpenRouter invalide');
      } else if (response.status === 429) {
        throw new Error('Limite de taux OpenRouter atteinte');
      } else {
        throw new Error(`Erreur OpenRouter (${response.status}): ${errorText}`);
      }
    }
    
    return await response.json();
  } else {
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: 'You are a professional ebook writer who creates high-quality, structured content.' },
        { role: 'user', content: prompt }
      ]
    };

    // Handle API parameter differences for newer vs legacy models
    if (model.includes('gpt-5') || model.includes('o3') || model.includes('o4') || model.includes('gpt-4.1')) {
      requestBody.max_completion_tokens = 8000;
    } else {
      requestBody.max_tokens = 8000;
      requestBody.temperature = 0.7;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      
      if (response.status === 401) {
        throw new Error('Clé API OpenAI invalide');
      } else if (response.status === 429) {
        throw new Error('Limite de taux OpenAI atteinte');
      } else {
        throw new Error(`Erreur OpenAI (${response.status}): ${errorText}`);
      }
    }
    
    return await response.json();
  }
}

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
      template = 'business',
      chapters = []
    } = await req.json();

    console.log('📚 Starting 3-phase ebook generation:', { title, format, useAI, model, template });

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

    // Generate content with AI using 3-phase architecture
    if (useAI && prompt) {
      console.log('🚀 Starting 3-phase ebook generation...');
      
      // PHASE 1: Generate complete table of contents
      console.log('📋 Phase 1: Generating table of contents...');
      const tocPrompt = `Create a detailed table of contents for a professional ebook:

Title: ${title}
Author: ${author}
Topic: ${prompt}
Template: ${template}

REQUIREMENTS:
- Target: 15,000-25,000 words total (comprehensive ebook)
- 15-25 chapters (800-1200 words each)
- Professional structure suitable for publication

MANDATORY STRUCTURE:
1. Avant-propos (400-600 mots)
2. Table des matières (auto-generated)
3. Introduction (800-1000 mots)
4. 15-20 core chapters (800-1200 mots each)
5. Conclusion (600-800 mots)

Return ONLY a JSON object with this exact structure:
{
  "title": "${title}",
  "chapters": [
    {"id": 1, "type": "foreword", "title": "Avant-propos", "summary": "Brief description", "target_words": 500},
    {"id": 2, "type": "intro", "title": "Introduction", "summary": "Brief description", "target_words": 900},
    {"id": 3, "type": "chapter", "title": "Chapter title", "summary": "What this chapter covers", "target_words": 1000},
    ...
    {"id": "last", "type": "conclusion", "title": "Conclusion", "summary": "Brief description", "target_words": 700}
  ],
  "total_estimated_words": estimated_total
}

Focus on ${template} style content. Be comprehensive and professional.`;

      // Phase 1: Generate Table of Contents
      const tocResponse = await callAI(tocPrompt, model, isOpenRouterModel(model));
      let tableOfContents;
      
      try {
        const tocContent = tocResponse.choices[0].message.content;
        // Clean JSON response (remove markdown code blocks if present)
        const cleanedToc = tocContent.replace(/```json\n?|\n?```/g, '').trim();
        tableOfContents = JSON.parse(cleanedToc);
        console.log(`📋 TOC generated: ${tableOfContents.chapters.length} chapters, estimated ${tableOfContents.total_estimated_words} words`);
      } catch (error) {
        console.error('❌ Failed to parse TOC JSON:', error);
        throw new Error('Erreur lors de la génération de la table des matières');
      }

      // Phase 2: Generate each chapter
      console.log('✍️ Phase 2: Generating chapters...');
      const generatedChapters = [];
      let fullContent = `# ${title}\n\n*Par ${author}*\n\n`;
      
      // Generate table of contents section
      fullContent += '## Table des matières\n\n';
      tableOfContents.chapters.forEach((chapter: any, index: number) => {
        if (chapter.type !== 'toc') {
          fullContent += `${index + 1}. ${chapter.title}\n`;
        }
      });
      fullContent += '\n---\n\n';

      // Generate each chapter content
      for (let i = 0; i < tableOfContents.chapters.length; i++) {
        const chapter = tableOfContents.chapters[i];
        if (chapter.type === 'toc') continue; // Skip TOC entry
        
        console.log(`📝 Generating chapter ${i + 1}/${tableOfContents.chapters.length}: "${chapter.title}"`);
        
        // Create context-aware prompt for each chapter
        const chapterPrompt = `Write the complete content for this chapter of the ebook "${title}" by ${author}.

CHAPTER DETAILS:
- Title: ${chapter.title}
- Type: ${chapter.type}
- Summary: ${chapter.summary}
- Target words: ${chapter.target_words}
- Template style: ${template}

CONTEXT (Book overview):
Topic: ${prompt}
${i > 0 ? `Previous chapter: "${tableOfContents.chapters[i-1].title}"` : ''}
${i < tableOfContents.chapters.length - 1 ? `Next chapter: "${tableOfContents.chapters[i+1].title}"` : ''}

REQUIREMENTS:
- Write exactly ${chapter.target_words} words (${chapter.target_words - 100} to ${chapter.target_words + 100} range acceptable)
- Professional, engaging tone
- Use proper Markdown formatting (## for chapter title, ### for sections)
- Include practical examples and actionable insights
- Ensure smooth flow and coherence with the overall book theme
- ${chapter.type === 'foreword' ? 'Write as a compelling foreword that hooks the reader' : ''}
- ${chapter.type === 'intro' ? 'Provide comprehensive introduction setting up the entire book' : ''}
- ${chapter.type === 'conclusion' ? 'Summarize key points and provide clear next steps' : ''}

Write the COMPLETE chapter content in Markdown format:`;

        try {
          const chapterResponse = await callAI(chapterPrompt, model, isOpenRouterModel(model));
          const chapterContent = chapterResponse.choices[0].message.content;
          
          generatedChapters.push({
            ...chapter,
            content: chapterContent,
            actual_words: chapterContent.split(/\s+/).length
          });
          
          fullContent += chapterContent + '\n\n';
          
          console.log(`✅ Chapter "${chapter.title}" generated: ${chapterContent.split(/\s+/).length} words`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Failed to generate chapter "${chapter.title}":`, error);
          // Add fallback content
          const fallbackContent = `## ${chapter.title}\n\n*Contenu en cours de développement pour ce chapitre important du livre.*\n\n${chapter.summary}`;
          generatedChapters.push({
            ...chapter,
            content: fallbackContent,
            actual_words: fallbackContent.split(/\s+/).length
          });
          fullContent += fallbackContent + '\n\n';
        }
      }

      // Phase 3: Final assembly and optimization
      console.log('🔧 Phase 3: Final assembly...');
      const totalWords = fullContent.split(/\s+/).length;
      console.log(`📊 Final ebook: ${totalWords} words across ${generatedChapters.length} chapters`);
      
      content = fullContent;
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