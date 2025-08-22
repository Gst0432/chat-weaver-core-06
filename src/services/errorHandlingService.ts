export interface ErrorInfo {
  code: string;
  message: string;
  originalError: string;
  suggestions: string[];
  fallbackModel?: string;
  documentation?: string;
  severity: 'low' | 'medium' | 'high';
  canRetry: boolean;
}

export class ErrorHandlingService {
  private static errorDatabase: Record<string, ErrorInfo> = {
    'rate_limit': {
      code: 'rate_limit',
      message: 'Limite de débit atteinte',
      originalError: 'Rate limit exceeded',
      suggestions: [
        'Attendez quelques secondes avant de réessayer',
        'Utilisez un modèle moins sollicité',
        'Réduisez la taille de votre requête'
      ],
      fallbackModel: 'openai/gpt-4o-mini',
      severity: 'medium',
      canRetry: true
    },
    'model_offline': {
      code: 'model_offline',
      message: 'Modèle temporairement indisponible',
      originalError: 'Model is currently offline',
      suggestions: [
        'Le modèle sera de nouveau disponible sous peu',
        'Essayez un modèle alternatif de même performance',
        'Activez le basculement automatique'
      ],
      fallbackModel: 'anthropic/claude-3-sonnet',
      severity: 'medium',
      canRetry: true
    },
    'context_length': {
      code: 'context_length',
      message: 'Message trop long pour ce modèle',
      originalError: 'Context length exceeded',
      suggestions: [
        'Réduisez la taille de votre message',
        'Utilisez un modèle avec plus de contexte',
        'Divisez votre demande en plusieurs parties'
      ],
      fallbackModel: 'anthropic/claude-3-sonnet',
      severity: 'high',
      canRetry: false
    },
    'api_key': {
      code: 'api_key',
      message: 'Problème d\'authentification',
      originalError: 'Invalid API key',
      suggestions: [
        'Vérifiez votre clé API',
        'Contactez le support si le problème persiste',
        'Essayez avec un autre provider'
      ],
      severity: 'high',
      canRetry: false
    },
    'quota_exceeded': {
      code: 'quota_exceeded',
      message: 'Quota dépassé pour ce modèle',
      originalError: 'Quota exceeded',
      suggestions: [
        'Attendez le renouvellement de votre quota',
        'Utilisez un modèle avec quota disponible',
        'Contactez le support pour augmenter vos limites'
      ],
      fallbackModel: 'openai/gpt-4o-mini',
      severity: 'medium',
      canRetry: true
    },
    'network_error': {
      code: 'network_error',
      message: 'Problème de connexion réseau',
      originalError: 'Network error',
      suggestions: [
        'Vérifiez votre connexion internet',
        'Réessayez dans quelques instants',
        'Le problème peut venir du serveur'
      ],
      severity: 'medium',
      canRetry: true
    },
    'timeout': {
      code: 'timeout',
      message: 'Délai d\'attente dépassé',
      originalError: 'Request timeout',
      suggestions: [
        'Réduisez la complexité de votre demande',
        'Essayez un modèle plus rapide',
        'Réessayez avec un délai plus long'
      ],
      fallbackModel: 'openai/gpt-4o-mini',
      severity: 'medium',
      canRetry: true
    },
    'content_filter': {
      code: 'content_filter',
      message: 'Contenu bloqué par les filtres',
      originalError: 'Content filtered',
      suggestions: [
        'Reformulez votre demande',
        'Évitez le contenu sensible',
        'Utilisez un modèle avec moins de restrictions'
      ],
      severity: 'low',
      canRetry: false
    }
  };

  static analyzeError(error: any): ErrorInfo {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorLower = errorMessage.toLowerCase();

    // Pattern matching pour identifier le type d'erreur
    if (errorLower.includes('rate limit') || errorLower.includes('429')) {
      return this.errorDatabase.rate_limit;
    }
    
    if (errorLower.includes('offline') || errorLower.includes('unavailable') || errorLower.includes('503')) {
      return this.errorDatabase.model_offline;
    }
    
    if (errorLower.includes('context') || errorLower.includes('token limit') || errorLower.includes('413')) {
      return this.errorDatabase.context_length;
    }
    
    if (errorLower.includes('api key') || errorLower.includes('unauthorized') || errorLower.includes('401')) {
      return this.errorDatabase.api_key;
    }
    
    if (errorLower.includes('quota') || errorLower.includes('billing') || errorLower.includes('402')) {
      return this.errorDatabase.quota_exceeded;
    }
    
    if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch')) {
      return this.errorDatabase.network_error;
    }
    
    if (errorLower.includes('timeout') || errorLower.includes('408')) {
      return this.errorDatabase.timeout;
    }
    
    if (errorLower.includes('content') || errorLower.includes('filter') || errorLower.includes('policy')) {
      return this.errorDatabase.content_filter;
    }

    // Erreur générique
    return {
      code: 'unknown',
      message: 'Erreur inattendue',
      originalError: errorMessage,
      suggestions: [
        'Réessayez votre demande',
        'Vérifiez votre connexion',
        'Contactez le support si le problème persiste'
      ],
      fallbackModel: 'openai/gpt-4o-mini',
      severity: 'medium',
      canRetry: true
    };
  }

  static getRecoveryAction(errorInfo: ErrorInfo): {
    action: 'retry' | 'fallback' | 'manual';
    delay?: number;
    fallbackModel?: string;
    message: string;
  } {
    switch (errorInfo.code) {
      case 'rate_limit':
        return {
          action: 'retry',
          delay: 5000,
          message: 'Nouvelle tentative dans 5 secondes...'
        };
      
      case 'model_offline':
      case 'quota_exceeded':
        return {
          action: 'fallback',
          fallbackModel: errorInfo.fallbackModel,
          message: `Basculement vers ${errorInfo.fallbackModel}`
        };
      
      case 'network_error':
      case 'timeout':
        return {
          action: 'retry',
          delay: 3000,
          message: 'Reconnexion en cours...'
        };
      
      case 'context_length':
      case 'api_key':
      case 'content_filter':
        return {
          action: 'manual',
          message: 'Intervention manuelle requise'
        };
      
      default:
        return {
          action: 'retry',
          delay: 2000,
          message: 'Nouvelle tentative...'
        };
    }
  }

  static formatUserMessage(errorInfo: ErrorInfo): string {
    return `❌ **${errorInfo.message}**\n\n` +
           `💡 **Suggestions :**\n` +
           errorInfo.suggestions.map(s => `• ${s}`).join('\n') +
           (errorInfo.fallbackModel ? `\n\n🔄 **Alternative :** ${errorInfo.fallbackModel}` : '') +
           (errorInfo.documentation ? `\n\n📚 [En savoir plus](${errorInfo.documentation})` : '');
  }

  static shouldShowToUser(errorInfo: ErrorInfo): boolean {
    // Ne pas montrer les erreurs de faible gravité qui se résolvent automatiquement
    return errorInfo.severity !== 'low' || !errorInfo.canRetry;
  }

  static getRetryStrategy(errorInfo: ErrorInfo): {
    maxRetries: number;
    baseDelay: number;
    backoffMultiplier: number;
  } {
    switch (errorInfo.severity) {
      case 'low':
        return { maxRetries: 1, baseDelay: 1000, backoffMultiplier: 1 };
      case 'medium':
        return { maxRetries: 3, baseDelay: 2000, backoffMultiplier: 1.5 };
      case 'high':
        return { maxRetries: 0, baseDelay: 0, backoffMultiplier: 1 };
      default:
        return { maxRetries: 2, baseDelay: 1500, backoffMultiplier: 1.2 };
    }
  }
}