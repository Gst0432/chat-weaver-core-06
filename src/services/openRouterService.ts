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
  // Categories de modèles populaires - Mise à jour avec GPT-5 et derniers modèles
  static getPopularModels(): OpenRouterModel[] {
    return [
      // === PHASE 1: GPT-5 OPENAI (via OpenRouter) ===
      {
        id: 'openai/gpt-5-2025-08-07',
        name: 'GPT-5',
        provider: 'OpenAI',
        category: 'Flagship',
        pricing: { prompt: 0.01, completion: 0.03 },
        context_length: 200000,
        description: 'Le flagship GPT-5 avec capacités avancées'
      },
      {
        id: 'openai/gpt-5-mini-2025-08-07',
        name: 'GPT-5 Mini',
        provider: 'OpenAI',
        category: 'Économique',
        pricing: { prompt: 0.0005, completion: 0.002 },
        context_length: 200000,
        description: 'Version économique et rapide de GPT-5'
      },
      {
        id: 'openai/gpt-5-nano-2025-08-07',
        name: 'GPT-5 Nano',
        provider: 'OpenAI',
        category: 'Ultra-rapide',
        pricing: { prompt: 0.0001, completion: 0.0005 },
        context_length: 128000,
        description: 'Version ultra-rapide pour tâches simples'
      },
      {
        id: 'openai/o3-2025-04-16',
        name: 'O3',
        provider: 'OpenAI',
        category: 'Raisonnement',
        pricing: { prompt: 0.02, completion: 0.08 },
        context_length: 200000,
        description: 'Modèle de raisonnement très puissant'
      },
      {
        id: 'openai/o4-mini-2025-04-16',
        name: 'O4 Mini',
        provider: 'OpenAI',
        category: 'Raisonnement rapide',
        pricing: { prompt: 0.005, completion: 0.02 },
        context_length: 128000,
        description: 'Raisonnement rapide et efficace'
      },

      // === PHASE 2.1: ANTHROPIC CLAUDE 4 + NOUVEAUX ===
      {
        id: 'anthropic/claude-opus-4-20250514',
        name: 'Claude Opus 4',
        provider: 'Anthropic',
        category: 'Flagship',
        pricing: { prompt: 0.015, completion: 0.075 },
        context_length: 200000,
        description: 'Le plus capable et intelligent avec raisonnement supérieur'
      },
      {
        id: 'anthropic/claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'Anthropic',
        category: 'Performance',
        pricing: { prompt: 0.008, completion: 0.04 },
        context_length: 200000,
        description: 'Haute performance avec raisonnement exceptionnel'
      },
      {
        id: 'anthropic/claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'Anthropic',
        category: 'Rapide',
        pricing: { prompt: 0.0008, completion: 0.004 },
        context_length: 200000,
        description: 'Le plus rapide pour réponses immédiates'
      },
      {
        id: 'anthropic/claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        provider: 'Anthropic',
        category: 'Thinking étendu',
        pricing: { prompt: 0.006, completion: 0.03 },
        context_length: 200000,
        description: 'Thinking étendu mais remplacé par Claude 4'
      },
      {
        id: 'anthropic/claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        category: 'Généraliste',
        pricing: { prompt: 0.003, completion: 0.015 },
        context_length: 200000,
        description: 'Modèle précédent intelligent (remplacé)'
      },

      // === PHASE 2.2: GOOGLE GEMINI 2.0 + DERNIERS ===
      {
        id: 'google/gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Exp',
        provider: 'Google',
        category: 'Nouvelle génération',
        pricing: { prompt: 0.001, completion: 0.004 },
        context_length: 1000000,
        description: 'Nouvelle génération multimodale avancée'
      },
      {
        id: 'google/gemini-exp-1206',
        name: 'Gemini Exp 1206',
        provider: 'Google',
        category: 'Expérimental',
        pricing: { prompt: 0.002, completion: 0.008 },
        context_length: 2000000,
        description: 'Expérimental avancé avec nouvelles capacités'
      },
      {
        id: 'google/learnlm-1.5-pro-experimental',
        name: 'LearnLM 1.5 Pro',
        provider: 'Google',
        category: 'Apprentissage',
        pricing: { prompt: 0.0015, completion: 0.006 },
        context_length: 1000000,
        description: 'Spécialisé apprentissage et éducation'
      },
      {
        id: 'google/gemini-pro-1.5-exp',
        name: 'Gemini Pro 1.5 Exp',
        provider: 'Google',
        category: 'Pro expérimental',
        pricing: { prompt: 0.00125, completion: 0.005 },
        context_length: 2000000,
        description: 'Pro expérimental avec capacités étendues'
      },
      {
        id: 'google/gemini-flash-1.5-8b',
        name: 'Gemini Flash 1.5 8B',
        provider: 'Google',
        category: 'Compacte',
        pricing: { prompt: 0.0001, completion: 0.0004 },
        context_length: 1000000,
        description: 'Version compacte et économique'
      },

      // === PHASE 2.3: META LLAMA 3.3 + VARIANTS ===
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        provider: 'Meta',
        category: 'Dernière version',
        pricing: { prompt: 0.0006, completion: 0.0006 },
        context_length: 32768,
        description: 'Dernière version Llama avec améliorations'
      },
      {
        id: 'meta-llama/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision',
        provider: 'Meta',
        category: 'Vision',
        pricing: { prompt: 0.0008, completion: 0.0008 },
        context_length: 32768,
        description: 'Modèle vision avancé avec 90B paramètres'
      },
      {
        id: 'meta-llama/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision',
        provider: 'Meta',
        category: 'Vision compacte',
        pricing: { prompt: 0.0002, completion: 0.0002 },
        context_length: 32768,
        description: 'Vision compacte et économique'
      },
      {
        id: 'meta-llama/llama-3.1-nemotron-70b-instruct',
        name: 'Llama 3.1 Nemotron 70B',
        provider: 'Meta',
        category: 'Optimisé',
        pricing: { prompt: 0.0005, completion: 0.0005 },
        context_length: 32768,
        description: 'Version optimisée pour performance'
      },
      {
        id: 'meta-llama/llama-3.1-405b-instruct-free',
        name: 'Llama 3.1 405B Free',
        provider: 'Meta',
        category: 'Gratuit',
        pricing: { prompt: 0, completion: 0 },
        context_length: 32768,
        description: 'Version gratuite du modèle 405B'
      },

      // === PHASE 2.4: MISTRAL NOUVEAUX MODÈLES ===
      {
        id: 'mistralai/mistral-large-2411',
        name: 'Mistral Large 2411',
        provider: 'Mistral',
        category: 'Dernière version',
        pricing: { prompt: 0.002, completion: 0.006 },
        context_length: 32768,
        description: 'Dernière version du modèle Large'
      },
      {
        id: 'mistralai/pixtral-large-2411',
        name: 'Pixtral Large 2411',
        provider: 'Mistral',
        category: 'Multimodal',
        pricing: { prompt: 0.003, completion: 0.009 },
        context_length: 32768,
        description: 'Modèle multimodal avec vision'
      },
      {
        id: 'mistralai/ministral-8b-2410',
        name: 'Ministral 8B',
        provider: 'Mistral',
        category: 'Compact',
        pricing: { prompt: 0.0002, completion: 0.0006 },
        context_length: 32768,
        description: 'Version compacte et rapide'
      },
      {
        id: 'mistralai/ministral-3b-2410',
        name: 'Ministral 3B',
        provider: 'Mistral',
        category: 'Ultra-compact',
        pricing: { prompt: 0.0001, completion: 0.0003 },
        context_length: 32768,
        description: 'Version ultra-compacte économique'
      },
      {
        id: 'mistralai/codestral-2405',
        name: 'Codestral 2405',
        provider: 'Mistral',
        category: 'Code',
        pricing: { prompt: 0.0015, completion: 0.0045 },
        context_length: 32768,
        description: 'Spécialisé code et programmation'
      },

      // === PHASE 2.5: DEEPSEEK V3 + SPÉCIALISÉS ===
      {
        id: 'deepseek/deepseek-v3',
        name: 'DeepSeek V3',
        provider: 'DeepSeek',
        category: 'Dernière génération',
        pricing: { prompt: 0.0008, completion: 0.0024 },
        context_length: 64000,
        description: 'Dernière génération avec performances accrues'
      },
      {
        id: 'deepseek/deepseek-r1-lite-preview',
        name: 'DeepSeek R1 Lite',
        provider: 'DeepSeek',
        category: 'Raisonnement',
        pricing: { prompt: 0.001, completion: 0.003 },
        context_length: 32000,
        description: 'Modèle de raisonnement optimisé'
      },
      {
        id: 'deepseek/deepseek-coder-v2-lite-instruct',
        name: 'DeepSeek Coder V2 Lite',
        provider: 'DeepSeek',
        category: 'Code optimisé',
        pricing: { prompt: 0.0006, completion: 0.0018 },
        context_length: 32000,
        description: 'Code optimisé pour développement'
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'DeepSeek',
        category: 'Chat',
        pricing: { prompt: 0.0014, completion: 0.0028 },
        context_length: 16384,
        description: 'Version chat polyvalente'
      },
      {
        id: 'deepseek/deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        provider: 'DeepSeek',
        category: 'Raisonnement pur',
        pricing: { prompt: 0.0012, completion: 0.0036 },
        context_length: 32000,
        description: 'Spécialisé raisonnement pur et logique'
      },

      // === PHASE 3.1: xAI GROK ===
      {
        id: 'x-ai/grok-2-1212',
        name: 'Grok 2.1212',
        provider: 'xAI',
        category: 'Dernière génération',
        pricing: { prompt: 0.002, completion: 0.01 },
        context_length: 131072,
        description: 'Grok dernière génération avec personnalité'
      },
      {
        id: 'x-ai/grok-2-vision-1212',
        name: 'Grok 2 Vision',
        provider: 'xAI',
        category: 'Vision',
        pricing: { prompt: 0.003, completion: 0.015 },
        context_length: 131072,
        description: 'Grok avec capacités vision avancées'
      },
      {
        id: 'x-ai/grok-beta',
        name: 'Grok Beta',
        provider: 'xAI',
        category: 'Beta',
        pricing: { prompt: 0.0015, completion: 0.0075 },
        context_length: 131072,
        description: 'Version beta expérimentale'
      },

      // === PHASE 3.2: COHERE ===
      {
        id: 'cohere/command-r-plus-08-2024',
        name: 'Command R+ 08-2024',
        provider: 'Cohere',
        category: 'Premium',
        pricing: { prompt: 0.003, completion: 0.015 },
        context_length: 128000,
        description: 'Command R+ version avancée'
      },
      {
        id: 'cohere/command-r-08-2024',
        name: 'Command R 08-2024',
        provider: 'Cohere',
        category: 'Standard',
        pricing: { prompt: 0.0015, completion: 0.0075 },
        context_length: 128000,
        description: 'Command R version standard'
      },
      {
        id: 'cohere/command-light',
        name: 'Command Light',
        provider: 'Cohere',
        category: 'Légère',
        pricing: { prompt: 0.0003, completion: 0.0015 },
        context_length: 4096,
        description: 'Version légère et économique'
      },

      // === PHASE 3.3: PERPLEXITY ÉTENDUS ===
      {
        id: 'perplexity/llama-3.1-sonar-huge-128k-online',
        name: 'Sonar Huge 128K Online',
        provider: 'Perplexity',
        category: 'Recherche en ligne',
        pricing: { prompt: 0.005, completion: 0.005 },
        context_length: 128000,
        description: 'Recherche en ligne avec modèle huge'
      },
      {
        id: 'perplexity/llama-3.1-sonar-large-128k-online',
        name: 'Sonar Large 128K Online',
        provider: 'Perplexity',
        category: 'Recherche large',
        pricing: { prompt: 0.002, completion: 0.002 },
        context_length: 128000,
        description: 'Version large avec recherche web'
      },
      {
        id: 'perplexity/llama-3.1-sonar-small-128k-online',
        name: 'Sonar Small 128K Online',
        provider: 'Perplexity',
        category: 'Recherche compacte',
        pricing: { prompt: 0.0005, completion: 0.0005 },
        context_length: 128000,
        description: 'Version compacte avec recherche web'
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
    // PHASE 4: Recommandations mises à jour avec nouveaux modèles
    const recommendations = {
      code: 'mistralai/codestral-2405', // Spécialisé code dernière version
      creative: 'anthropic/claude-opus-4-20250514', // Claude 4 pour créativité
      reasoning: 'openai/o3-2025-04-16', // O3 pour raisonnement avancé
      general: 'openai/gpt-5-mini-2025-08-07', // GPT-5 Mini par défaut
      fast: 'openai/gpt-5-nano-2025-08-07' // GPT-5 Nano ultra-rapide
    };

    return recommendations[taskType] || recommendations.general;
  }
}