interface TaskAnalysis {
  type: 'code' | 'reasoning' | 'creative' | 'general' | 'vision';
  complexity: 'low' | 'medium' | 'high';
  length: 'short' | 'medium' | 'long';
}

export class ModelRouterService {
  static analyzeTask(prompt: string): TaskAnalysis {
    const lowerPrompt = prompt.toLowerCase();
    
    // Détection du type de tâche
    let type: TaskAnalysis['type'] = 'general';
    
    // Détection code
    if (lowerPrompt.includes('code') || lowerPrompt.includes('javascript') || 
        lowerPrompt.includes('react') || lowerPrompt.includes('fonction') ||
        lowerPrompt.includes('api') || lowerPrompt.includes('component') ||
        lowerPrompt.includes('css') || lowerPrompt.includes('html') ||
        lowerPrompt.includes('debug') || lowerPrompt.includes('erreur')) {
      type = 'code';
    }
    
    // Détection raisonnement
    else if (lowerPrompt.includes('analyse') || lowerPrompt.includes('calcul') ||
             lowerPrompt.includes('mathematique') || lowerPrompt.includes('logique') ||
             lowerPrompt.includes('résoudre') || lowerPrompt.includes('problème') ||
             lowerPrompt.includes('stratégie') || lowerPrompt.includes('planifier')) {
      type = 'reasoning';
    }
    
    // Détection créatif
    else if (lowerPrompt.includes('écris') || lowerPrompt.includes('histoire') ||
             lowerPrompt.includes('créatif') || lowerPrompt.includes('article') ||
             lowerPrompt.includes('blog') || lowerPrompt.includes('marketing') ||
             lowerPrompt.includes('slogan') || lowerPrompt.includes('poème')) {
      type = 'creative';
    }

    // Détection vision (images)
    else if (lowerPrompt.includes('image') || lowerPrompt.includes('photo') ||
             lowerPrompt.includes('visuel') || lowerPrompt.includes('describe')) {
      type = 'vision';
    }
    
    // Détection complexité
    const complexity: TaskAnalysis['complexity'] = 
      prompt.length > 500 ? 'high' : 
      prompt.length > 100 ? 'medium' : 'low';
    
    // Détection longueur de réponse attendue
    const length: TaskAnalysis['length'] = 
      lowerPrompt.includes('détaillé') || lowerPrompt.includes('complet') || 
      lowerPrompt.includes('exhaustif') ? 'long' :
      lowerPrompt.includes('bref') || lowerPrompt.includes('court') ||
      lowerPrompt.includes('résumé') ? 'short' : 'medium';
    
    return { type, complexity, length };
  }

  static selectBestModel(analysis: TaskAnalysis): string {
    console.log('🎯 Analyse tâche:', analysis);
    
    // Pour le code spécialisé
    if (analysis.type === 'code') {
      if (analysis.complexity === 'high') {
        return 'gpt-5-2025-08-07'; // Le plus puissant pour code complexe
      } else {
        return 'gpt-5-mini-2025-08-07'; // Rapide et efficace
      }
    }
    
    // Pour le raisonnement complexe
    if (analysis.type === 'reasoning') {
      if (analysis.complexity === 'high') {
        return 'o3-2025-04-16'; // Spécialisé raisonnement
      } else {
        return 'o4-mini-2025-04-16'; // Raisonnement rapide
      }
    }
    
    // Pour les tâches créatives
    if (analysis.type === 'creative') {
      return 'gpt-5-2025-08-07'; // Excellent pour la créativité
    }
    
    // Pour les tâches courtes/simples
    if (analysis.complexity === 'low' && analysis.length === 'short') {
      return 'gpt-5-nano-2025-08-07'; // Ultra-rapide
    }
    
    // Défaut : GPT-5 standard
    return 'gpt-5-2025-08-07';
  }

  static getOptimalParameters(model: string, analysis: TaskAnalysis) {
    const isNewModel = model.startsWith('gpt-5') || model.startsWith('o3-') || model.startsWith('o4-');
    
    const params: any = { model };
    
    // Tokens selon la longueur attendue
    const maxTokens = analysis.length === 'long' ? 4000 : 
                     analysis.length === 'medium' ? 2000 : 1000;
    
    if (isNewModel) {
      params.max_completion_tokens = maxTokens;
      // Pas de temperature pour nouveaux modèles
    } else {
      params.max_tokens = maxTokens;
      // Temperature selon le type de tâche
      params.temperature = analysis.type === 'creative' ? 0.8 : 
                          analysis.type === 'code' ? 0.3 : 0.7;
    }
    
    console.log(`🔧 Paramètres pour ${model}:`, params);
    return params;
  }
}