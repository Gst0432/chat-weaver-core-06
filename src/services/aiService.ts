import { supabase } from '@/integrations/supabase/client';

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

      if (error) throw error;
      
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

      if (error) throw error;
      
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

export const aiService = new AIService();