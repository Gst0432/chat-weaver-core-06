/**
 * Service de cache intelligent pour optimiser les performances
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface UserContext {
  embeddings?: any; // Flexible pour différents types d'embeddings
  subscription?: any;
  preferences?: any;
  recentModels?: string[];
}

export class PerformanceCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static userContextCache = new Map<string, UserContext>();
  private static responseCache = new Map<string, CacheEntry<string>>();

  /**
   * Cache générique avec TTL
   */
  static set<T>(key: string, data: T, ttlMs = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      hits: 0
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  /**
   * Cache contexte utilisateur (embeddings, subscription, etc.)
   */
  static setUserContext(userId: string, context: Partial<UserContext>): void {
    const existing = this.userContextCache.get(userId) || {};
    this.userContextCache.set(userId, { ...existing, ...context });
  }

  static getUserContext(userId: string): UserContext | null {
    return this.userContextCache.get(userId) || null;
  }

  /**
   * Cache réponses partielles pour démarrage rapide
   */
  static cachePartialResponse(promptHash: string, response: string): void {
    this.responseCache.set(promptHash, {
      data: response,
      timestamp: Date.now(),
      ttl: 60000, // 1 minute pour réponses partielles
      hits: 0
    });
  }

  static getPartialResponse(promptHash: string): string | null {
    const entry = this.responseCache.get(promptHash);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.responseCache.delete(promptHash);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  /**
   * Hash simple pour les prompts
   */
  static hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Préchargement intelligent
   */
  static async preloadUserData(userId: string): Promise<void> {
    try {
      // Précharger en arrière-plan (ne pas bloquer l'UI)
      const context = this.getUserContext(userId);
      if (!context?.subscription) {
        // Charger subscription en background
        this.loadSubscriptionInBackground(userId);
      }
      if (!context?.embeddings) {
        // Charger embeddings récents en background
        this.loadEmbeddingsInBackground(userId);
      }
    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }

  private static async loadSubscriptionInBackground(userId: string): Promise<void> {
    // Background loading sans bloquer
    setTimeout(async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('check-subscription');
        if (data) {
          this.setUserContext(userId, { subscription: data });
        }
      } catch (error) {
        console.warn('Background subscription load failed:', error);
      }
    }, 100);
  }

  private static async loadEmbeddingsInBackground(userId: string): Promise<void> {
    // Background loading sans bloquer
    setTimeout(async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('embeddings')
          .select('embedding')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (data?.[0]?.embedding) {
          this.setUserContext(userId, { embeddings: data[0].embedding });
        }
      } catch (error) {
        console.warn('Background embeddings load failed:', error);
      }
    }, 200);
  }

  /**
   * Nettoyage automatique du cache
   */
  static cleanup(): void {
    const now = Date.now();
    
    // Nettoyer cache principal
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Nettoyer cache réponses
    for (const [key, entry] of this.responseCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.responseCache.delete(key);
      }
    }

    // Nettoyer contexte utilisateur (après 30min)
    for (const [userId, context] of this.userContextCache.entries()) {
      // Garder les contextes actifs plus longtemps
    }
  }

  /**
   * Statistiques du cache
   */
  static getStats() {
    return {
      cacheSize: this.cache.size,
      userContextSize: this.userContextCache.size,
      responsesCached: this.responseCache.size,
      hitRatio: this.calculateHitRatio()
    };
  }

  private static calculateHitRatio(): number {
    let totalHits = 0;
    let totalEntries = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
    }
    
    return totalEntries > 0 ? (totalHits / totalEntries) : 0;
  }
}

// Auto-cleanup toutes les 5 minutes
setInterval(() => {
  PerformanceCache.cleanup();
}, 300000);