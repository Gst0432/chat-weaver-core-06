import { supabase } from '@/integrations/supabase/client';
import { ErrorHandlingService } from './errorHandlingService';
import { ModelRecommendationService } from './modelRecommendationService';

export interface StreamingOptions {
  messages: Array<{ role: string; content: string }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Service de streaming universel pour tous les providers IA
 * Supporte OpenAI, Claude, Gemini, DeepSeek, OpenRouter avec 400+ modèles
 */
export class StreamingService {
  
  /**
   * Démarre un stream optimisé avec n'importe quel modèle
   */
  static async streamGeneration(options: StreamingOptions): Promise<void> {
    const { messages, model, temperature = 0.7, maxTokens = 2000, onChunk, onComplete, onError } = options;
    
    try {
      console.log('🚀 Starting optimized stream with model:', model);
      
      const provider = this.detectProvider(model);
      const functionName = this.getFunctionName(provider);
      
      // Support streaming pour TOUS les modèles, y compris GPT-5/O3/O4
      const streamingPayload = {
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
        stream: true
      };

      const response = await fetch(`https://jeurznrjcohqbevrzses.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXJ6bnJqY29ocWJldnJ6c2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MDAyMTgsImV4cCI6MjA3MDI3NjIxOH0.0lLgSsxohxeWN3d4ZKmlNiMyGDj2L7K8XRAwMq9zaaI`
        },
        body: JSON.stringify(streamingPayload)
      });

      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader');
      }

      let fullText = '';
      let chunkBuffer = '';
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Optimisation: décodage en chunks plus large
          chunkBuffer += decoder.decode(value, { stream: true });
          const lines = chunkBuffer.split('\n');
          chunkBuffer = lines.pop() || ''; // Garde la dernière ligne partielle

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || 
                              parsed.choices?.[0]?.message?.content ||
                              parsed.content;
                
                if (content) {
                  fullText += content;
                  // Émission immédiate du chunk
                  onChunk?.(content);
                }
              } catch (parseError) {
                // Silencieux pour éviter le spam de logs
              }
            }
          }
        }
        
        onComplete?.(fullText);
      } finally {
        reader.releaseLock();
      }
      
    } catch (error) {
      console.error('❌ Streaming error:', error);
      onError?.(error as Error);
    }
  }

  /**
   * Détecte le provider basé sur le nom du modèle (optimisé pour GPT-5/O3/O4)
   */
  private static detectProvider(model: string): 'openai' | 'claude' | 'gemini' | 'deepseek' | 'openrouter' {
    // Support optimisé pour les nouveaux modèles
    if (model.includes('gpt-5') || model.includes('o3-') || model.includes('o4-')) {
      return 'openrouter'; // Via OpenRouter pour GPT-5
    }
    if (model.includes('gpt') || model.includes('o1')) {
      return 'openai';
    }
    if (model.includes('claude')) {
      return 'claude';
    }
    if (model.includes('gemini')) {
      return 'gemini';
    }
    if (model.includes('deepseek')) {
      return 'deepseek';
    }
    // Par défaut, utiliser OpenRouter qui supporte 400+ modèles
    return 'openrouter';
  }

  /**
   * Obtient le nom de la fonction edge correspondante (streaming prioritaire)
   */
  private static getFunctionName(provider: string): string {
    const functions = {
      openai: 'openai-chat-stream',
      claude: 'claude-chat-stream', 
      gemini: 'gemini-chat-stream',
      deepseek: 'deepseek-chat-stream',
      openrouter: 'openrouter-chat-stream'
    };
    
    return functions[provider as keyof typeof functions] || 'openrouter-chat-stream';
  }

  /**
   * Stream avec fallback automatique
   */
  static async streamWithFallback(options: StreamingOptions): Promise<void> {
    try {
      await this.streamGeneration(options);
    } catch (error) {
      console.warn('Primary streaming failed, attempting intelligent fallback:', error);
      
      // Analyser l'erreur et recommander un modèle de fallback
      const errorInfo = ErrorHandlingService.analyzeError(error);
      const fallbackModel = errorInfo.fallbackModel || 'openai/gpt-4o-mini';
      
      // Si on a un prompt, utiliser le service de recommandation
      let intelligentFallback = fallbackModel;
      if (options.messages.length > 0) {
        const prompt = options.messages[options.messages.length - 1]?.content || '';
        if (prompt.trim().length > 10) {
          const analysis = ModelRecommendationService.analyzePrompt(prompt);
          intelligentFallback = ModelRecommendationService.getBestModelForTask(analysis);
        }
      }
      
      const fallbackOptions = {
        ...options,
        model: intelligentFallback
      };
      
      try {
        await this.streamGeneration(fallbackOptions);
      } catch (fallbackError) {
        // Dernier recours : modèle le plus stable
        const finalFallbackOptions = {
          ...options,
          model: 'openai/gpt-4o-mini'
        };
        await this.streamGeneration(finalFallbackOptions);
      }
    }
  }

  /**
   * Teste la disponibilité du streaming pour un modèle
   */
  static async testStreaming(model: string): Promise<boolean> {
    try {
      const provider = this.detectProvider(model);
      const functionName = this.getFunctionName(provider);
      
      const response = await fetch(`https://jeurznrjcohqbevrzses.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXJ6bnJqY29ocWJldnJ6c2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MDAyMTgsImV4cCI6MjA3MDI3NjIxOH0.0lLgSsxohxeWN3d4ZKmlNiMyGDj2L7K8XRAwMq9zaaI`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          model,
          stream: true,
          max_tokens: 1
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}