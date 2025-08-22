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

    // PHASE 4: Scoring mis à jour pour nouveaux modèles
    // Task type matching avec priorité nouveaux modèles
    if (analysis.type === 'code') {
      if (model.id.includes('codestral-2405')) score += 45; // Meilleur code spécialisé
      else if (model.id.includes('deepseek-coder-v2')) score += 40;
      else if (model.id.includes('claude-opus-4') || model.id.includes('claude-sonnet-4')) score += 35;
      else if (model.id.includes('claude')) score += 25;
    }
    
    if (analysis.type === 'creative') {
      if (model.id.includes('claude-opus-4')) score += 45; // Claude 4 top créativité
      else if (model.id.includes('gpt-5')) score += 40;
      else if (model.id.includes('mistral-large-2411')) score += 35;
      else if (model.id.includes('gpt-4')) score += 20;
    }
    
    if (analysis.type === 'reasoning') {
      if (model.id.includes('o3-2025')) score += 50; // O3 meilleur raisonnement
      else if (model.id.includes('claude-opus-4')) score += 45;
      else if (model.id.includes('deepseek-reasoner')) score += 40;
      else if (model.id.includes('o4-mini')) score += 35;
      else if (model.id.includes('claude') || model.id.includes('o1')) score += 25;
    }
    
    if (analysis.type === 'vision') {
      if (model.id.includes('llama-3.2') && model.id.includes('vision')) score += 45;
      else if (model.id.includes('pixtral-large')) score += 40;
      else if (model.id.includes('grok-2-vision')) score += 35;
      else if (model.id.includes('gemini-2.0')) score += 30;
      else if (model.id.includes('gpt-4')) score += 25;
    }
    
    if (analysis.type === 'math') {
      if (model.id.includes('o3-2025')) score += 50;
      else if (model.id.includes('deepseek-reasoner')) score += 45;
      else if (model.id.includes('claude-opus-4')) score += 40;
      else if (model.id.includes('o1')) score += 35;
    }

    // Speed preference avec nouveaux modèles
    if (analysis.speed === 'fast') {
      if (model.id.includes('gpt-5-nano')) score += 35;
      else if (model.id.includes('ministral-3b') || model.id.includes('ministral-8b')) score += 30;
      else if (model.id.includes('gemini-flash-1.5-8b')) score += 25;
      else if (model.id.includes('mini') || model.id.includes('haiku')) score += 20;
    }
    
    if (analysis.speed === 'quality') {
      if (model.id.includes('claude-opus-4') || model.id.includes('claude-sonnet-4')) score += 35;
      else if (model.id.includes('gpt-5-2025')) score += 30;
      else if (model.id.includes('claude-3-5-sonnet')) score += 20;
    }

    // Budget preference optimisé
    if (analysis.budget === 'economy') {
      if (model.pricing.prompt === 0) score += 25; // Modèles gratuits
      else if (model.pricing.prompt < 0.0005) score += 20;
      else if (model.pricing.prompt < 0.001) score += 15;
    }
    
    if (analysis.budget === 'premium') {
      if (model.id.includes('claude-opus-4') || model.id.includes('gpt-5') || model.id.includes('o3')) score += 15;
      else if (model.pricing.prompt > 0.01) score += 10;
    }

    // Nouveaux modèles bonus
    if (model.id.includes('2025') || model.id.includes('2411') || model.id.includes('v3')) score += 10;
    
    // Complexity matching amélioré
    if (analysis.complexity === 'high' && !model.id.includes('mini') && !model.id.includes('nano') && !model.id.includes('light')) score += 15;
    if (analysis.complexity === 'low' && (model.id.includes('mini') || model.id.includes('nano') || model.id.includes('light'))) score += 10;

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
    
    // Tags économiques et gratuits
    if (model.pricing.prompt === 0) tags.push('🆓 Gratuit');
    else if (model.id.includes('mini') || model.id.includes('nano') || model.pricing.prompt < 0.001) tags.push('💰 Économique');
    
    // Tags premium nouveaux modèles
    if (model.id.includes('gpt-5') || model.id.includes('claude') && model.id.includes('4')) tags.push('👑 Premium');
    else if (model.id.includes('o3') || model.id.includes('claude-opus-4')) tags.push('🏆 Flagship');
    
    // Tags vitesse
    if (model.id.includes('nano') || model.id.includes('ministral-3b')) tags.push('🚀 Ultra-rapide');
    else if (model.id.includes('mini') || model.id.includes('haiku') || model.id.includes('flash')) tags.push('⚡ Rapide');
    
    // Tags spécialisés
    if (analysis.type === 'code' || model.id.includes('code') || model.id.includes('coder')) tags.push('💻 Code');
    if (analysis.type === 'creative' || model.category === 'Créatif') tags.push('🎨 Créatif');
    if (model.id.includes('vision') || model.id.includes('pixtral')) tags.push('👁️ Vision');
    if (model.id.includes('reasoning') || model.id.includes('reasoner') || model.id.includes('o3') || model.id.includes('o4')) tags.push('🧠 Raisonnement');
    
    // Tags contexte et capacités
    if (model.context_length > 100000) tags.push('📚 Large contexte');
    if (model.id.includes('online') || model.provider === 'Perplexity') tags.push('🌐 Web Search');
    
    // Tags génération et nouveauté
    if (model.id.includes('2025') || model.id.includes('2411') || model.id.includes('v3')) tags.push('🆕 Nouveau');
    if (model.id.includes('exp') || model.id.includes('beta') || model.id.includes('preview')) tags.push('🧪 Expérimental');
    
    // Tags fournisseurs spéciaux
    if (model.provider === 'Mistral' || model.provider === 'Mistral AI') tags.push('🇫🇷 Français');
    if (model.provider === 'xAI') tags.push('🤖 Grok');
    if (model.provider === 'Meta') tags.push('🦙 Open Source');
    
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
    return recommendations[0]?.model.id || 'openai/gpt-5-mini-2025-08-07'; // Nouveau défaut GPT-5 Mini
  }
}