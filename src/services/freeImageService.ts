import { supabase } from "@/integrations/supabase/client";

export interface FreeImageOptions {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  category?: string;
  color?: string;
  size?: 'small' | 'regular' | 'full';
  count?: number;
}

export interface FreeImage {
  id: string;
  url: string;
  downloadUrl: string;
  photographer: string;
  photographerUrl: string;
  width: number;
  height: number;
  alt: string;
  source: 'unsplash' | 'pexels';
}

/**
 * Service pour récupérer des images gratuites depuis Unsplash et Pexels
 */
export class FreeImageService {
  private static unsplashBaseUrl = 'https://api.unsplash.com';
  private static pexelsBaseUrl = 'https://api.pexels.com/v1';

  /**
   * Récupère des images gratuites contextuelles pour un type de business
   */
  static async getImagesForContext(context: string, count: number = 6): Promise<FreeImage[]> {
    const keywords = this.extractKeywords(context);
    const images: FreeImage[] = [];
    
    try {
      // Essayer Unsplash d'abord
      const unsplashImages = await this.searchUnsplash(keywords, Math.ceil(count / 2));
      images.push(...unsplashImages);

      // Compléter avec Pexels si besoin
      if (images.length < count) {
        const pexelsImages = await this.searchPexels(keywords, count - images.length);
        images.push(...pexelsImages);
      }

      return images.slice(0, count);
    } catch (error) {
      console.error('Erreur récupération images:', error);
      return [];
    }
  }

  /**
   * Recherche sur Unsplash avec API publique (pas de clé requise)
   */
  private static async searchUnsplash(query: string, count: number): Promise<FreeImage[]> {
    try {
      // Utiliser l'API publique Unsplash Source pour éviter les limites de taux
      const images: FreeImage[] = [];
      const keywords = query.split(' ').slice(0, 3); // Limiter à 3 mots-clés

      for (let i = 0; i < count; i++) {
        const keyword = keywords[i % keywords.length];
        const width = 800;
        const height = 600;
        
        const imageUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keyword)}&${i}`;
        
        images.push({
          id: `unsplash-${Date.now()}-${i}`,
          url: imageUrl,
          downloadUrl: imageUrl,
          photographer: 'Unsplash Community',
          photographerUrl: 'https://unsplash.com',
          width,
          height,
          alt: `${keyword} image`,
          source: 'unsplash'
        });
      }

      return images;
    } catch (error) {
      console.error('Erreur Unsplash:', error);
      return [];
    }
  }

  /**
   * Recherche sur Pexels (nécessite une clé API mais elle est gratuite)
   */
  private static async searchPexels(query: string, count: number): Promise<FreeImage[]> {
    try {
      // Vérifier si la clé API Pexels est disponible
      const { data: keyData } = await supabase.functions.invoke('get-pexels-key');
      if (!keyData?.apiKey) {
        console.log('Clé API Pexels non configurée, utilisation d\'images par défaut');
        return this.getFallbackImages(query, count);
      }

      const response = await fetch(`${this.pexelsBaseUrl}/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`, {
        headers: {
          'Authorization': keyData.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.photos?.map((photo: any) => ({
        id: `pexels-${photo.id}`,
        url: photo.src.large,
        downloadUrl: photo.src.original,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        width: photo.width,
        height: photo.height,
        alt: photo.alt || query,
        source: 'pexels' as const
      })) || [];

    } catch (error) {
      console.error('Erreur Pexels:', error);
      return this.getFallbackImages(query, count);
    }
  }

  /**
   * Images de fallback quand les APIs ne sont pas disponibles
   */
  private static getFallbackImages(query: string, count: number): FreeImage[] {
    const fallbackCategories = [
      'business', 'technology', 'office', 'team', 'success', 'growth',
      'innovation', 'digital', 'modern', 'professional'
    ];

    return Array.from({ length: count }, (_, i) => {
      const category = fallbackCategories[i % fallbackCategories.length];
      return {
        id: `fallback-${Date.now()}-${i}`,
        url: `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&auto=format`,
        downloadUrl: `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=900&fit=crop&auto=format`,
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        width: 800,
        height: 600,
        alt: `${query} ${category}`,
        source: 'unsplash' as const
      };
    });
  }

  /**
   * Extrait les mots-clés pertinents d'un contexte business
   */
  private static extractKeywords(context: string): string {
    const businessKeywords = {
      'voiture': 'car automotive vehicle',
      'restaurant': 'restaurant food dining',
      'hotel': 'hotel hospitality travel',
      'e-commerce': 'shopping online store',
      'fitness': 'gym fitness workout',
      'beauté': 'beauty cosmetics spa',
      'immobilier': 'real estate property house',
      'éducation': 'education learning school',
      'santé': 'healthcare medical doctor',
      'finance': 'finance money banking',
      'technologie': 'technology digital innovation',
      'mode': 'fashion clothing style'
    };

    const contextLower = context.toLowerCase();
    
    for (const [key, keywords] of Object.entries(businessKeywords)) {
      if (contextLower.includes(key)) {
        return keywords;
      }
    }

    // Si aucun mot-clé spécifique, utiliser des termes business génériques
    return 'business professional modern';
  }

  /**
   * Télécharge une image et la convertit en base64
   */
  static async downloadAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erreur téléchargement image:', error);
      throw error;
    }
  }
}