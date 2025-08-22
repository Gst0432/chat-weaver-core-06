import { supabase } from '@/integrations/supabase/client';

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  category: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
  description: string;
}

export class OpenRouterService {
  // Categories de modèles populaires
  static getPopularModels(): OpenRouterModel[] {
    return [
      // === MODÈLES OPENAI ===
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        category: 'Généraliste',
        pricing: { prompt: 0.005, completion: 0.015 },
        context_length: 128000,
        description: 'Modèle multimodal le plus avancé d\'OpenAI'
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI', 
        category: 'Rapide',
        pricing: { prompt: 0.00015, completion: 0.0006 },
        context_length: 128000,
        description: 'Version rapide et économique de GPT-4o'
      },
      {
        id: 'openai/o1-preview',
        name: 'o1-preview',
        provider: 'OpenAI',
        category: 'Raisonnement',
        pricing: { prompt: 0.015, completion: 0.06 },
        context_length: 128000,
        description: 'Modèle de raisonnement avancé d\'OpenAI'
      },

      // === MODÈLES ANTHROPIC ===
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        category: 'Généraliste',
        pricing: { prompt: 0.003, completion: 0.015 },
        context_length: 200000,
        description: 'Modèle équilibré d\'Anthropic, excellent pour l\'écriture'
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        category: 'Rapide',
        pricing: { prompt: 0.00025, completion: 0.00125 },
        context_length: 200000,
        description: 'Version rapide et économique de Claude'
      },

      // === MODÈLES GOOGLE ===
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: 'Google',
        category: 'Généraliste',
        pricing: { prompt: 0.00125, completion: 0.005 },
        context_length: 2000000,
        description: 'Modèle avec contexte ultra-long de Google'
      },
      {
        id: 'google/gemini-flash-1.5',
        name: 'Gemini Flash 1.5',
        provider: 'Google',
        category: 'Rapide',
        pricing: { prompt: 0.000075, completion: 0.0003 },
        context_length: 1000000,
        description: 'Version rapide de Gemini avec grand contexte'
      },

      // === MODÈLES META ===
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B',
        provider: 'Meta',
        category: 'Généraliste',
        pricing: { prompt: 0.00275, completion: 0.00275 },
        context_length: 32768,
        description: 'Plus grand modèle open-source de Meta'
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        provider: 'Meta',
        category: 'Performance',
        pricing: { prompt: 0.00052, completion: 0.00052 },
        context_length: 32768,
        description: 'Modèle open-source performant de Meta'
      },

      // === MODÈLES SPÉCIALISÉS CODE ===
      {
        id: 'meta-llama/codellama-34b-instruct',
        name: 'Code Llama 34B',
        provider: 'Meta',
        category: 'Code',
        pricing: { prompt: 0.00052, completion: 0.00052 },
        context_length: 32768,
        description: 'Modèle spécialisé pour la génération de code'
      },
      {
        id: 'deepseek/deepseek-coder',
        name: 'DeepSeek Coder',
        provider: 'DeepSeek',
        category: 'Code',
        pricing: { prompt: 0.0014, completion: 0.0028 },
        context_length: 16384,
        description: 'Modèle expert en programmation'
      },

      // === MODÈLES CRÉATIFS ===
      {
        id: 'mistralai/mistral-large',
        name: 'Mistral Large',
        provider: 'Mistral',
        category: 'Créatif',
        pricing: { prompt: 0.002, completion: 0.006 },
        context_length: 32768,
        description: 'Modèle français excellent pour la créativité'
      }
    ];
  }

  static async generateWithModel(
    messages: Array<{ role: string; content: string }>,
    model: string = 'openai/gpt-4o-mini',
    options: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ) {
    try {
      console.log('🔄 Generating with OpenRouter model:', model);

      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: {
          messages,
          model,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: options.stream || false
        }
      });

      if (error) {
        console.error('❌ OpenRouter service error:', error);
        throw new Error(`OpenRouter error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from OpenRouter');
      }

      console.log('✅ OpenRouter generation successful:', { 
        model, 
        textLength: data.text?.length 
      });

      return {
        text: data.text || '',
        model: model,
        rawResponse: data.rawResponse
      };
    } catch (error) {
      console.error('❌ OpenRouter generation failed:', error);
      throw error;
    }
  }

  static getModelsByCategory(): Record<string, OpenRouterModel[]> {
    const models = this.getPopularModels();
    const categories: Record<string, OpenRouterModel[]> = {};
    
    models.forEach(model => {
      if (!categories[model.category]) {
        categories[model.category] = [];
      }
      categories[model.category].push(model);
    });

    return categories;
  }

  static findModelById(modelId: string): OpenRouterModel | undefined {
    return this.getPopularModels().find(model => model.id === modelId);
  }

  static getRecommendedModel(taskType: 'code' | 'creative' | 'reasoning' | 'general' | 'fast'): string {
    const recommendations = {
      code: 'meta-llama/codellama-34b-instruct',
      creative: 'mistralai/mistral-large',
      reasoning: 'openai/o1-preview',
      general: 'anthropic/claude-3.5-sonnet',
      fast: 'openai/gpt-4o-mini'
    };

    return recommendations[taskType] || recommendations.general;
  }
}