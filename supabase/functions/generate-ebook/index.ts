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

// Enhanced retry logic with exponential backoff
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt > maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      const errorMessage = error.message.toLowerCase();
      const isRetryable = errorMessage.includes('502') || 
                         errorMessage.includes('503') || 
                         errorMessage.includes('429') ||
                         errorMessage.includes('timeout') ||
                         errorMessage.includes('network');
      
      if (!isRetryable) {
        throw error;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms delay`);
      await delay(delayMs);
    }
  }
  throw new Error('Max retries exceeded');
}

async function callAI(prompt: string, model: string, useOpenRouter: boolean, retryCount: number = 0): Promise<any> {
  // Enhanced AI calling with fallback and retry
  const callWithRetry = async (useRouter: boolean, modelToUse: string) => {
    return await retryWithBackoff(async () => {
      if (useRouter) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://chatelix.com',
            'X-Title': 'Chatelix Ebook Generator'
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: 'You are a professional ebook writer who creates high-quality, structured content.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 4000, // Réduit pour vitesse
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ OpenRouter API error:', errorText);
          
          if (response.status === 401) {
            throw new Error('Clé API OpenRouter invalide');
          } else if (response.status === 429) {
            throw new Error('Limite de taux OpenRouter atteinte (429)');
          } else if (response.status === 502) {
            throw new Error('Erreur serveur OpenRouter (502 Bad Gateway)');
          } else if (response.status === 503) {
            throw new Error('Service OpenRouter temporairement indisponible (503)');
          } else {
            throw new Error(`Erreur OpenRouter (${response.status}): ${errorText}`);
          }
        }
        
        return await response.json();
      } else {
        const requestBody: any = {
          model: modelToUse,
          messages: [
            { role: 'system', content: 'You are a professional ebook writer who creates high-quality, structured content.' },
            { role: 'user', content: prompt }
          ]
        };

        // Handle API parameter differences for newer vs legacy models
        // Réduire max_tokens pour vitesse (8000 -> 4000)
        if (modelToUse.includes('gpt-5') || modelToUse.includes('o3') || modelToUse.includes('o4') || modelToUse.includes('gpt-4.1')) {
          requestBody.max_completion_tokens = 4000;
        } else {
          requestBody.max_tokens = 4000;
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
            throw new Error('Limite de taux OpenAI atteinte (429)');
          } else if (response.status === 502) {
            throw new Error('Erreur serveur OpenAI (502 Bad Gateway)');
          } else if (response.status === 503) {
            throw new Error('Service OpenAI temporairement indisponible (503)');
          } else {
            throw new Error(`Erreur OpenAI (${response.status}): ${errorText}`);
          }
        }
        
        return await response.json();
      }
    }, 3, 1000); // 3 retries with 1s base delay (réduit pour vitesse)
  };

  try {
    // Primary attempt with specified provider
    return await callWithRetry(useOpenRouter, model);
  } catch (error) {
    console.log(`⚠️ Primary API failed: ${error.message}`);
    
    // Fallback strategy: try the other provider if available
    if (!useOpenRouter && Deno.env.get('OPENROUTER_API_KEY')) {
      console.log('🔄 Falling back to OpenRouter...');
      try {
        // Use a reliable OpenRouter model as fallback
        const fallbackModel = 'openai/gpt-4o-mini';
        return await callWithRetry(true, fallbackModel);
      } catch (fallbackError) {
        console.error('❌ Fallback to OpenRouter also failed:', fallbackError.message);
        throw new Error(`Toutes les APIs ont échoué. OpenAI: ${error.message}, OpenRouter: ${fallbackError.message}`);
      }
    } else if (useOpenRouter && Deno.env.get('OPENAI_API_KEY')) {
      console.log('🔄 Falling back to OpenAI...');
      try {
        // Use a reliable OpenAI model as fallback
        const fallbackModel = 'gpt-4o-mini';
        return await callWithRetry(false, fallbackModel);
      } catch (fallbackError) {
        console.error('❌ Fallback to OpenAI also failed:', fallbackError.message);
        throw new Error(`Toutes les APIs ont échoué. OpenRouter: ${error.message}, OpenAI: ${fallbackError.message}`);
      }
    }
    
    // No fallback available, re-throw original error
    throw error;
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
      model = 'gpt-5-nano-2025-08-07', // Ultra-rapide par défaut
      template = 'business',
      chapters = [],
      resume_generation_id = null, // For resuming partial generations
      fast_mode = true // Mode rapide par défaut pour 3mn
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

    // Check generation limits for scalability
    const { data: limits, error: limitsError } = await supabase
      .rpc('check_generation_limits', { user_id_param: user.id });
    
    if (limitsError) {
      console.error('❌ Error checking limits:', limitsError);
    } else if (!limits.can_start && !resume_generation_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Generation limit reached', 
          details: limits.reason,
          limits: limits 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    let generation;
    
    // Resume existing generation or create new one
    if (resume_generation_id) {
      const { data: existingGeneration } = await supabase
        .from('ebook_generations')
        .select('*')
        .eq('id', resume_generation_id)
        .eq('user_id', user.id)
        .single();
      
      if (existingGeneration) {
        generation = existingGeneration;
        console.log('🔄 Resuming generation:', generation.id);
      }
    }
    
    if (!generation) {
      // Create new generation record
      const { data: newGeneration, error: generationError } = await supabase
        .from('ebook_generations')
        .insert({
          user_id: user.id,
          title,
          author,
          prompt,
          model,
          template,
          status: 'pending'
        })
        .select()
        .single();

      if (generationError) {
        console.error('❌ Generation record creation error:', generationError);
        return new Response(
          JSON.stringify({ error: 'Failed to create generation record' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      generation = newGeneration;
    }

    console.log('🎯 Generation record created:', generation.id);

    // Background task with 3-minute timeout
    const backgroundGeneration = async () => {
      const startTime = Date.now();
      const TIMEOUT_MS = 180000; // 3 minutes
      
      const checkTimeout = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > TIMEOUT_MS) {
          throw new Error('Generation timeout (3 minutes exceeded)');
        }
        return elapsed;
      };

      try {
        let content = '';

        // Generate content with AI using 3-phase architecture
        if (useAI && prompt) {
          console.log('🚀 Starting 3-phase ebook generation...');
          
          // PHASE 1: Generate complete table of contents
          await supabase.from('ebook_generations').update({
            status: 'generating_toc',
            progress: 10
          }).eq('id', generation.id);

          console.log('📋 Phase 1: Generating table of contents...');
          // Mode rapide ou complet selon le paramètre
          const targetWords = fast_mode ? '6,000-10,000' : '15,000-25,000';
          const chapterCount = fast_mode ? '8-12' : '15-25';
          const chapterWords = fast_mode ? '400-600' : '800-1200';

          const tocPrompt = `Create a detailed table of contents for a professional ebook:

Title: ${title}
Author: ${author}
Topic: ${prompt}
Template: ${template}

REQUIREMENTS FOR ${fast_mode ? 'FAST MODE (3-minute generation)' : 'FULL MODE'}:
- Target: ${targetWords} words total
- ${chapterCount} chapters (${chapterWords} words each)
- Professional structure suitable for publication

MANDATORY STRUCTURE FOR ${fast_mode ? 'FAST MODE' : 'FULL MODE'}:
1. Avant-propos (${fast_mode ? '300-400' : '400-600'} mots)
2. Table des matières (auto-generated)
3. Introduction (${fast_mode ? '400-600' : '800-1000'} mots)
4. ${fast_mode ? '6-8' : '15-20'} core chapters (${chapterWords} mots each) 
5. Conclusion (${fast_mode ? '300-500' : '600-800'} mots)

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
            
            // Update generation status
            await supabase.from('ebook_generations').update({
              status: 'generating_chapters',
              progress: 20,
              total_chapters: tableOfContents.chapters.length
            }).eq('id', generation.id);
            
          } catch (error) {
            console.error('❌ Failed to parse TOC JSON:', error);
            await supabase.from('ebook_generations').update({
              status: 'failed',
              error_message: 'Erreur lors de la génération de la table des matières'
            }).eq('id', generation.id);
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
            
            // Vérifier timeout avant chaque chapitre
            checkTimeout();
            
            console.log(`📝 Generating chapter ${i + 1}/${tableOfContents.chapters.length}: "${chapter.title}"`);
            
            // Update progress
            const progressPercent = Math.round(20 + (i / tableOfContents.chapters.length) * 70);
            await supabase.from('ebook_generations').update({
              current_chapter: i + 1,
              progress: progressPercent
            }).eq('id', generation.id);
            
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
              const wordCount = chapterContent.split(/\s+/).length;
              
              // 🎯 CHECKPOINT: Save each chapter immediately for recovery
              await supabase.from('ebook_chapters').insert({
                generation_id: generation.id,
                chapter_number: i + 1,
                chapter_title: chapter.title,
                chapter_content: chapterContent,
                chapter_type: chapter.type,
                word_count: wordCount
              });
              
              generatedChapters.push({
                ...chapter,
                content: chapterContent,
                actual_words: wordCount
              });
              
              fullContent += chapterContent + '\n\n';
              
              console.log(`✅ Chapter "${chapter.title}" generated: ${wordCount} words (saved checkpoint)`);
              
              // Update generated chapters count
              await supabase.from('ebook_generations').update({
                generated_chapters: i + 1
              }).eq('id', generation.id);
              
              // Small delay to avoid rate limiting (réduit pour vitesse)
              await new Promise(resolve => setTimeout(resolve, 200));
              
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
          await supabase.from('ebook_generations').update({
            status: 'assembling',
            progress: 95
          }).eq('id', generation.id);
          
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
          console.error('❌ Database error:', dbError);
          await supabase.from('ebook_generations').update({
            status: 'failed',
            error_message: 'Failed to save ebook'
          }).eq('id', generation.id);
          return;
        }

        // Mark generation as completed
        await supabase.from('ebook_generations').update({
          status: 'completed',
          progress: 100,
          ebook_id: ebook.id,
          completed_at: new Date().toISOString()
        }).eq('id', generation.id);

        console.log('✅ Ebook generation completed successfully!');

      } catch (error: any) {
        console.error('❌ Background generation failed:', error);
        
        // En cas de timeout, sauvegarder le contenu partiel
        const isTimeout = error.message?.includes('timeout');
        const errorMessage = isTimeout ? 
          'Timeout (3 minutes) - Contenu partiel disponible' : 
          error.message;
        
        await supabase.from('ebook_generations').update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        }).eq('id', generation.id);
      }
    };

    // Start background task
    EdgeRuntime.waitUntil(backgroundGeneration());

    // Return immediate response with generation ID
    return new Response(
      JSON.stringify({
        generation_id: generation.id,
        status: 'started',
        message: 'Ebook generation started in background'
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