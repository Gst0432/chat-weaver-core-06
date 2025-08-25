import { supabase } from '@/integrations/supabase/client';
import { ModelRouterService } from './modelRouterService';
import { PromptEngineerService } from './promptEngineerService';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  generatedText: string;
  raw?: any;
}

class AIService {
  async generateWithOpenAI(
    messages: AIMessage[],
    model = 'gpt-4.1-2025-04-14',
    temperature = 0.7,
    maxTokens = 2000
  ): Promise<AIResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages,
          model,
          temperature,
          max_tokens: maxTokens
        }
      });

      if (error) {
        console.error('OpenAI API Error Details:', error);
        throw error;
      }
      
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid OpenAI response structure:', data);
        throw new Error('Structure de réponse OpenAI invalide');
      }
      
      return {
        generatedText: data.choices[0].message.content,
        raw: data
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Erreur OpenAI: ${error}`);
    }
  }

  async generateWithDeepSeek(
    messages: AIMessage[],
    model = 'deepseek-chat',
    temperature = 0.7,
    maxTokens = 2000
  ): Promise<AIResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('deepseek-chat', {
        body: {
          messages,
          model,
          temperature,
          max_tokens: maxTokens
        }
      });

      if (error) {
        console.error('DeepSeek API Error Details:', error);
        throw error;
      }
      
      if (!data || !data.generatedText) {
        console.error('Invalid DeepSeek response structure:', data);
        throw new Error('Structure de réponse DeepSeek invalide');
      }
      
      return data;
    } catch (error) {
      console.error('DeepSeek API Error:', error);
      throw new Error(`Erreur DeepSeek: ${error}`);
    }
  }

  createCodeGenerationPrompt(description: string, fileType?: string): AIMessage[] {
    const systemPrompt = `Tu es un expert développeur full-stack. Tu génères du code de haute qualité, moderne et bien structuré.

Instructions:
1. Génère du code propre, commenté et optimisé
2. Utilise les meilleures pratiques actuelles
3. Assure-toi que le code est compatible avec les navigateurs modernes
4. Inclus les imports/dependencies nécessaires
5. Le code doit être prêt à l'emploi

${fileType ? `Type de fichier demandé: ${fileType}` : ''}

Format de réponse: Retourne uniquement le code sans explications supplémentaires.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description }
    ];
  }

  createFullAppPrompt(description: string): AIMessage[] {
    const systemPrompt = `Tu es un expert développeur full-stack qui génère des applications web complètes.

Instructions:
1. Crée une structure de projet complète avec package.json, HTML, CSS, et JavaScript/React
2. Utilise React avec JSX, Vite comme bundler
3. Applique un design moderne avec Tailwind CSS
4. Assure-toi que l'app est responsive et accessible
5. Inclus toutes les dependencies nécessaires
6. Le code doit être production-ready

Format de réponse: 
Retourne un objet JSON avec la structure suivante:
{
  "files": {
    "package.json": { "content": "...", "language": "json" },
    "index.html": { "content": "...", "language": "html" },
    "src/main.jsx": { "content": "...", "language": "javascript" },
    "src/App.jsx": { "content": "...", "language": "javascript" }
  },
  "description": "Description de l'application générée"
}`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description }
    ];
  }

  async generateCode(
    description: string,
    provider: 'openai' | 'deepseek' = 'openai',
    fileType?: string
  ): Promise<string> {
    // Check quota first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('Authentication required');
    }

    // Check quota via edge function
    const { data: quotaResult, error: quotaError } = await supabase.functions.invoke('quota-check', {
      body: { 
        action: 'increment',
        type: 'code'
      }
    });

    if (quotaError) {
      throw new Error(`Quota check failed: ${quotaError.message}`);
    }

    if (!quotaResult.success) {
      throw new Error(quotaResult.error || 'Quota exceeded');
    }

    const messages = this.createCodeGenerationPrompt(description, fileType);
    
    if (provider === 'openai') {
      const response = await this.generateWithOpenAI(messages);
      return response.generatedText;
    } else {
      const response = await this.generateWithDeepSeek(messages);
      return response.generatedText;
    }
  }

  async generateFullApp(
    description: string,
    provider: 'openai' | 'deepseek' = 'openai'
  ): Promise<{ files: any; description: string }> {
    const messages = this.createFullAppPrompt(description);
    
    let response: AIResponse;
    if (provider === 'openai') {
      response = await this.generateWithOpenAI(messages, 'gpt-4.1-2025-04-14', 0.7, 4000);
    } else {
      response = await this.generateWithDeepSeek(messages, 'deepseek-chat', 0.7, 4000);
    }
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response.generatedText);
      return parsed;
    } catch {
      // If not JSON, create a simple structure
      return {
        files: {
          "src/App.jsx": {
            content: response.generatedText,
            language: "javascript"
          }
        },
        description: "Application générée par IA"
      };
    }
  }
}

export const aiService = {
  // Nouveau: Génération intelligente avec auto-routing
  async generateIntelligent(
    prompt: string, 
    selectedModel: string = 'auto-router',
    personality: string = 'default',
    conversationHistory: string[] = []
  ): Promise<{ text: string; model: string; analysis: any }> {
    // Auto-routing si modèle automatique
    let finalModel = selectedModel;
    let analysis = null;
    
    if (selectedModel === 'auto-router') {
      analysis = ModelRouterService.analyzeTask(prompt);
      finalModel = ModelRouterService.selectBestModel(analysis);
      console.log('🎯 Auto-router sélectionne:', finalModel);
    }
    
    // Amélioration du prompt avec contexte
    const taskType = analysis?.type || 'general';
    const systemPrompt = PromptEngineerService.createSystemPrompt({
      taskType,
      userPersonality: personality as any,
      conversationHistory,
      isFirstMessage: conversationHistory.length === 0
    });
    
    const enhancedPrompt = PromptEngineerService.enhanceUserPrompt(prompt, {
      taskType,
      conversationHistory,
      isFirstMessage: conversationHistory.length === 0
    });

    // Paramètres optimaux
    const params = analysis ? 
      ModelRouterService.getOptimalParameters(finalModel, analysis) : 
      { model: finalModel };

    console.log('🚀 Génération avec:', { model: finalModel, analysis, params });

    // Appel API intelligent avec routage automatique
    let targetFunction = 'openai-chat';
    
    // Détecter le provider basé sur le modèle
    if (finalModel.startsWith('openai/') || finalModel.startsWith('anthropic/') || 
        finalModel.includes('gpt-5') || finalModel.includes('o3-') || finalModel.includes('o4-') ||
        finalModel.startsWith('meta/') || finalModel.startsWith('google/')) {
      targetFunction = 'openrouter-chat';
      console.log(`🎯 Using OpenRouter for model: ${finalModel}`);
    } else if (finalModel.includes('claude')) {
      targetFunction = 'claude-chat';
    } else if (finalModel.includes('gemini')) {
      targetFunction = 'gemini-chat';
    } else if (finalModel.includes('deepseek')) {
      targetFunction = 'deepseek-chat';
    }

    const { data, error } = await supabase.functions.invoke(targetFunction, {
      body: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedPrompt }
        ],
        ...params
      }
    });

    if (error) throw error;
    
    return {
      text: data.generatedText || data.content || 'Aucune réponse générée',
      model: finalModel,
      analysis
    };
  },

  async generateCode(prompt: string, provider: 'openai' | 'deepseek' = 'openai'): Promise<string> {
    // Check quota first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('Authentication required');
    }

    // Check quota via edge function
    const { data: quotaResult, error: quotaError } = await supabase.functions.invoke('quota-check', {
      body: { 
        action: 'increment',
        type: 'code'
      }
    });

    if (quotaError) {
      throw new Error(`Quota check failed: ${quotaError.message}`);
    }

    if (!quotaResult.success) {
      throw new Error(quotaResult.error || 'Quota exceeded');
    }

    // Generate code based on provider
    if (provider === 'deepseek') {
      const { data, error } = await supabase.functions.invoke('deepseek-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful coding assistant. Generate clean, well-commented code based on user requirements. Always provide complete, working code examples.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }
      });

      if (error) throw error;
      return data.response || data.content || 'No code generated';
    } else {
      // Utiliser OpenRouter pour les nouveaux modèles GPT-5
      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: {
          messages: [
            {
              role: 'system', 
              content: 'You are a helpful coding assistant. Generate clean, well-commented code based on user requirements. Always provide complete, working code examples.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'openai/gpt-5-2025-08-07', // Préfixe OpenRouter pour GPT-5
          max_completion_tokens: 2000
        }
      });

      if (error) throw error;
      return data.text || data.content || 'No code generated';
    }
  },

  async generateFullApp(
    description: string,
    provider: 'openai' | 'deepseek' = 'openai'
  ): Promise<{ files: any; description: string }> {
    // Check quota first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('Authentication required');
    }

    // Check quota via edge function
    const { data: quotaResult, error: quotaError } = await supabase.functions.invoke('quota-check', {
      body: { 
        action: 'increment',
        type: 'code'
      }
    });

    if (quotaError) {
      throw new Error(`Quota check failed: ${quotaError.message}`);
    }

    if (!quotaResult.success) {
      throw new Error(quotaResult.error || 'Quota exceeded');
    }

    const systemPrompt = `Tu es un expert développeur full-stack qui génère des applications web complètes.

Instructions:
1. Crée une structure de projet complète avec package.json, HTML, CSS, et JavaScript/React
2. Utilise React avec JSX, Vite comme bundler
3. Applique un design moderne avec Tailwind CSS
4. Assure-toi que l'app est responsive et accessible
5. Inclus toutes les dependencies nécessaires
6. Le code doit être production-ready

Format de réponse: 
Retourne un objet JSON avec la structure suivante:
{
  "files": {
    "package.json": { "content": "...", "language": "json" },
    "index.html": { "content": "...", "language": "html" },
    "src/main.jsx": { "content": "...", "language": "javascript" },
    "src/App.jsx": { "content": "...", "language": "javascript" }
  },
  "description": "Description de l'application générée"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description }
    ];

    let responseText: string;
    if (provider === 'deepseek') {
      const { data, error } = await supabase.functions.invoke('deepseek-chat', {
        body: { messages }
      });
      if (error) throw error;
      responseText = data.response || data.content || '';
    } else {
      // Utiliser OpenRouter pour les nouveaux modèles GPT-5
      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: {
          messages,
          model: 'openai/gpt-5-2025-08-07', // Préfixe OpenRouter pour GPT-5
          max_completion_tokens: 4000
        }
      });
      if (error) throw error;
      responseText = data.text || data.content || '';
    }

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch {
      // If not JSON, create a simple structure
      return {
        files: {
          "src/App.jsx": {
            content: responseText,
            language: "javascript"
          }
        },
        description: "Application générée par IA"
      };
    }
  },

  async checkQuota(): Promise<any> {
    const { data, error } = await supabase.functions.invoke('quota-check', {
      body: { action: 'check' }
    });

    if (error) throw error;
    return data;
  }
};