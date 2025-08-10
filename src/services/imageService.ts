import { supabase } from "@/integrations/supabase/client";

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'hd' | 'standard';
}

export interface ImageEditOptions {
  image: File;
  prompt: string;
  mask?: File;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'hd' | 'standard';
}

export interface ImageVariationOptions {
  image: File;
  n?: number;
  size?: '1024x1024' | '512x512' | '256x256';
  quality?: 'hd' | 'standard';
}

/**
 * Service centralisé pour toutes les opérations d'images
 * Force l'utilisation de DALL-E indépendamment du modèle sélectionné en frontend
 */
export class ImageService {
  /**
   * Génère une image avec DALL-E 3
   * Force toujours l'utilisation de DALL-E, ignore le modèle frontend
   */
  static async generateImage(options: ImageGenerationOptions): Promise<string> {
    console.log('🎨 Génération d\'image avec DALL-E 3:', options.prompt);
    
    const { data, error } = await supabase.functions.invoke('dalle-image', {
      body: {
        prompt: options.prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'hd'
      }
    });

    if (error) {
      console.error('Erreur génération DALL-E:', error);
      throw new Error(`Échec de génération d'image avec DALL-E: ${error.message}`);
    }

    if (!data?.image) {
      throw new Error('Aucune image retournée par DALL-E');
    }

    return data.image;
  }

  /**
   * Édite une image existante avec DALL-E 2
   * Force toujours l'utilisation de DALL-E, ignore le modèle frontend
   */
  static async editImage(options: ImageEditOptions): Promise<string> {
    console.log('✏️ Édition d\'image avec DALL-E 2:', options.prompt);

    const formData = new FormData();
    formData.append('prompt', options.prompt);
    formData.append('image', options.image);
    formData.append('size', options.size || '1024x1024');
    formData.append('quality', options.quality || 'hd');
    
    if (options.mask) {
      formData.append('mask', options.mask);
    }

    const { data, error } = await supabase.functions.invoke('openai-image-edit', {
      body: formData
    });

    if (error) {
      console.error('Erreur édition DALL-E:', error);
      throw new Error(`Échec d'édition d'image avec DALL-E: ${error.message}`);
    }

    if (!data?.image) {
      throw new Error('Aucune image éditée retournée par DALL-E');
    }

    return data.image;
  }

  /**
   * Crée des variations d'une image avec DALL-E 2
   * Force toujours l'utilisation de DALL-E, ignore le modèle frontend
   */
  static async createVariations(options: ImageVariationOptions): Promise<string[]> {
    console.log('🎭 Création de variations avec DALL-E 2, nombre:', options.n || 2);

    const formData = new FormData();
    formData.append('image', options.image);
    formData.append('size', options.size || '1024x1024');
    formData.append('quality', options.quality || 'hd');
    formData.append('n', (options.n || 2).toString());

    const { data, error } = await supabase.functions.invoke('openai-image-variations', {
      body: formData
    });

    if (error) {
      console.error('Erreur variations DALL-E:', error);
      throw new Error(`Échec de création de variations avec DALL-E: ${error.message}`);
    }

    if (!data?.images || !Array.isArray(data.images)) {
      throw new Error('Aucune variation retournée par DALL-E');
    }

    return data.images;
  }

  /**
   * Détecte si un message demande une génération d'image
   */
  static isImageRequest(message: string): boolean {
    const imageKeywords = [
      'image', 'photo', 'picture', 'illustration', 'dessin', 'logo', 'affiche',
      'génère une image', 'genere une image', 'générer une image', 
      'crée une image', 'create an image', 'generate an image',
      'draw', 'paint', 'sketch', 'artwork'
    ];
    
    return imageKeywords.some(keyword => 
      new RegExp(`\\b${keyword}\\b`, 'i').test(message)
    );
  }

  /**
   * Préserve le prompt original de l'utilisateur
   */
  static enhancePrompt(prompt: string): string {
    // On retourne toujours le prompt original sans modification
    return prompt;
  }
}