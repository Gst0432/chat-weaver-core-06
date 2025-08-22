import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources = ['perplexity', 'google'], max_results = 10 } = await req.json();

    console.log('🔍 Advanced web search:', { query, sources });

    const results: any[] = [];

    // Search with Perplexity (real-time data)
    if (sources.includes('perplexity')) {
      try {
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-large-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful research assistant. Provide comprehensive, accurate information with citations.'
              },
              {
                role: 'user',
                content: `Search for: ${query}. Provide detailed information with sources.`
              }
            ],
            temperature: 0.2,
            max_tokens: 2000,
            return_citations: true,
            return_images: false,
            return_related_questions: true,
            search_recency_filter: 'month'
          }),
        });

        if (perplexityResponse.ok) {
          const data = await perplexityResponse.json();
          results.push({
            source: 'perplexity',
            content: data.choices?.[0]?.message?.content || '',
            citations: data.citations || [],
            related_questions: data.related_questions || []
          });
        }
      } catch (error) {
        console.warn('Perplexity search failed:', error);
      }
    }

    // Search with OpenRouter (access to multiple search models)
    if (sources.includes('openrouter')) {
      try {
        const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://chatelix.com',
            'X-Title': 'Chatelix Search'
          },
          body: JSON.stringify({
            model: 'perplexity/llama-3.1-sonar-large-128k-online',
            messages: [
              {
                role: 'user',
                content: `Research and summarize current information about: ${query}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1500
          })
        });

        if (openrouterResponse.ok) {
          const data = await openrouterResponse.json();
          results.push({
            source: 'openrouter',
            content: data.choices?.[0]?.message?.content || '',
            model: 'perplexity/llama-3.1-sonar-large-128k-online'
          });
        }
      } catch (error) {
        console.warn('OpenRouter search failed:', error);
      }
    }

    // Synthesize results from multiple sources
    if (results.length > 1) {
      try {
        const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert research synthesizer. Combine information from multiple sources into a comprehensive, well-structured response with proper citations.'
              },
              {
                role: 'user',
                content: `Query: ${query}\n\nSources:\n${results.map((r, i) => `Source ${i + 1} (${r.source}):\n${r.content}`).join('\n\n')}\n\nSynthesize this information into a comprehensive response with citations.`
              }
            ],
            temperature: 0.2,
            max_tokens: 2000
          })
        });

        if (synthesisResponse.ok) {
          const synthesisData = await synthesisResponse.json();
          results.push({
            source: 'synthesis',
            content: synthesisData.choices?.[0]?.message?.content || '',
            type: 'combined_analysis'
          });
        }
      } catch (error) {
        console.warn('Synthesis failed:', error);
      }
    }

    return new Response(JSON.stringify({ 
      query,
      results,
      total_sources: results.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Advanced web search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});