import { OpenRouterService, OpenRouterModel } from './openRouterService';

export interface TaskAnalysis {
  type: 'code' | 'creative' | 'reasoning' | 'vision' | 'general' | 'translation' | 'math';
  complexity: 'low' | 'medium' | 'high';
  length: 'short' | 'medium' | 'long';
  budget: 'economy' | 'balanced' | 'premium';
  speed: 'fast' | 'balanced' | 'quality';
}

export interface ModelRecommendation {
  model: OpenRouterModel;
  score: number;
  reason: string;
  tags: string[];
  estimatedCost: number;
  expectedSpeed: 'fast' | 'medium' | 'slow';
  matchExplanation: string;
}

export class ModelRecommendationService {
  static analyzePrompt(prompt: string): TaskAnalysis {
    const text = prompt.toLowerCase();
    
    // Detect task type
    let type: TaskAnalysis['type'] = 'general';
    if (text.includes('code') || text.includes('programming') || text.includes('debug') || text.includes('function') || text.includes('algorithm')) {
      type = 'code';
    } else if (text.includes('creative') || text.includes('story') || text.includes('poem') || text.includes('marketing') || text.includes('blog')) {
      type = 'creative';
    } else if (text.includes('analyze') || text.includes('compare') || text.includes('logic') || text.includes('reasoning') || text.includes('think')) {
      type = 'reasoning';
    } else if (text.includes('image') || text.includes('photo') || text.includes('visual') || text.includes('picture')) {
      type = 'vision';
    } else if (text.includes('translate') || text.includes('translation') || text.includes('language')) {
      type = 'translation';
    } else if (text.includes('math') || text.includes('calculate') || text.includes('equation') || text.includes('formula')) {
      type = 'math';
    }
    
    // Detect complexity
    const complexity: TaskAnalysis['complexity'] = 
      text.length > 500 || text.includes('complex') || text.includes('detailed') || text.includes('comprehensive') ? 'high' :
      text.length > 100 || text.includes('analyze') || text.includes('explain') ? 'medium' : 'low';
    
    // Detect expected length
    const length: TaskAnalysis['length'] = 
      text.includes('detailed') || text.includes('comprehensive') || text.includes('complete') ? 'long' :
      text.includes('brief') || text.includes('short') || text.includes('quick') ? 'short' : 'medium';
    
    // Default preferences
    const budget: TaskAnalysis['budget'] = 'balanced';
    const speed: TaskAnalysis['speed'] = 'balanced';
    
    return { type, complexity, length, budget, speed };
  }

  static getRecommendations(analysis: TaskAnalysis, maxResults: number = 3): ModelRecommendation[] {
    const models = OpenRouterService.getPopularModels();
    const recommendations: ModelRecommendation[] = [];

    for (const model of models) {
      const score = this.calculateScore(model, analysis);
      const reason = this.generateReason(model, analysis);
      const tags = this.generateTags(model, analysis);
      const estimatedCost = this.estimateCost(model, analysis);
      const expectedSpeed = this.getExpectedSpeed(model);
      const matchExplanation = this.generateMatchExplanation(model, analysis);

      recommendations.push({
        model,
        score,
        reason,
        tags,
        estimatedCost,
        expectedSpeed,
        matchExplanation
      });
    }

    // Sort by score and return top results
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  private static calculateScore(model: OpenRouterModel, analysis: TaskAnalysis): number {
    let score = 50; // Base score

    // Task type matching
    if (analysis.type === 'code' && model.id.includes('claude')) score += 30;
    if (analysis.type === 'creative' && model.id.includes('gpt-4')) score += 25;
    if (analysis.type === 'reasoning' && (model.id.includes('claude') || model.id.includes('o1'))) score += 35;
    if (analysis.type === 'vision' && model.id.includes('gpt-4')) score += 30;
    if (analysis.type === 'math' && model.id.includes('o1')) score += 40;

    // Speed preference
    if (analysis.speed === 'fast' && model.id.includes('mini')) score += 20;
    if (analysis.speed === 'quality' && model.id.includes('claude-3-5-sonnet')) score += 25;

    // Budget preference
    if (analysis.budget === 'economy' && model.pricing.prompt < 0.001) score += 15;
    if (analysis.budget === 'premium' && model.pricing.prompt > 0.01) score += 10;

    // Complexity matching
    if (analysis.complexity === 'high' && !model.id.includes('mini')) score += 15;
    if (analysis.complexity === 'low' && model.id.includes('mini')) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private static generateReason(model: OpenRouterModel, analysis: TaskAnalysis): string {
    const reasons = [];
    
    if (analysis.type === 'code' && model.id.includes('claude')) {
      reasons.push('Excellent pour le code');
    }
    if (analysis.type === 'creative' && model.id.includes('gpt')) {
      reasons.push('Très créatif');
    }
    if (analysis.speed === 'fast' && model.id.includes('mini')) {
      reasons.push('Réponse rapide');
    }
    if (analysis.budget === 'economy' && model.pricing.prompt < 0.001) {
      reasons.push('Économique');
    }
    if (model.context_length > 100000) {
      reasons.push('Large contexte');
    }

    return reasons.join(' • ') || 'Modèle polyvalent';
  }

  private static generateTags(model: OpenRouterModel, analysis: TaskAnalysis): string[] {
    const tags = [];
    
    if (model.id.includes('mini') || model.pricing.prompt < 0.001) tags.push('Économique');
    if (model.id.includes('gpt-5') || model.id.includes('claude-3-5')) tags.push('Premium');
    if (model.id.includes('mini')) tags.push('Rapide');
    if (analysis.type === 'code') tags.push('Code');
    if (analysis.type === 'creative') tags.push('Créatif');
    if (model.context_length > 100000) tags.push('Large contexte');
    
    return tags;
  }

  private static estimateCost(model: OpenRouterModel, analysis: TaskAnalysis): number {
    const estimatedTokens = analysis.length === 'short' ? 100 : 
                           analysis.length === 'medium' ? 500 : 2000;
    return model.pricing.prompt * estimatedTokens + model.pricing.completion * estimatedTokens;
  }

  private static getExpectedSpeed(model: OpenRouterModel): 'fast' | 'medium' | 'slow' {
    if (model.id.includes('mini') || model.id.includes('haiku')) return 'fast';
    if (model.id.includes('gpt-5') || model.id.includes('claude-3-5-sonnet')) return 'medium';
    return 'slow';
  }

  private static generateMatchExplanation(model: OpenRouterModel, analysis: TaskAnalysis): string {
    const explanations = [];
    
    if (analysis.type === 'code' && model.id.includes('claude')) {
      explanations.push('Claude excelle dans la programmation et le débogage');
    }
    if (analysis.complexity === 'high' && !model.id.includes('mini')) {
      explanations.push('Modèle puissant adapté aux tâches complexes');
    }
    if (analysis.speed === 'fast' && model.id.includes('mini')) {
      explanations.push('Optimisé pour des réponses rapides');
    }
    
    return explanations.join('. ') || `${model.name} est un choix solide pour cette tâche`;
  }

  static getBestModelForTask(analysis: TaskAnalysis): string {
    const recommendations = this.getRecommendations(analysis, 1);
    return recommendations[0]?.model.id || 'openai/gpt-4o-mini';
  }
}