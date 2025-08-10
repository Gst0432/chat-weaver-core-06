import { supabase } from "@/integrations/supabase/client";
import { RunwareService, type GenerateImageParams as RunwareParams } from "./runwareService";

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'hd' | 'standard';
  provider?: 'dalle' | 'runware';
  // Options avancées Runware pour fidélité
  cfgScale?: number; // 1-20, plus élevé = plus fidèle
  steps?: number; // 1-50, plus élevé = plus de détails
  scheduler?: string;
  seed?: number;
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

// Instance globale Runware (sera initialisée si clé API disponible)
let runwareInstance: RunwareService | null = null;

/**
 * Service centralisé pour toutes les opérations d'images
 * Supporte DALL-E (OpenAI) et Runware pour plus de fidélité
 */
export class ImageService {
  
  /**
   * Initialise Runware si clé API disponible
   */
  static async initRunware(apiKey?: string): Promise<boolean> {
    try {
      if (apiKey) {
        runwareInstance = new RunwareService(apiKey);
        console.log("🚀 Runware initialisé avec clé API fournie");
        return true;
      }
      
      // Tenter de récupérer depuis Supabase
      const { data, error } = await supabase.functions.invoke('get-runware-key');
      if (!error && data?.apiKey) {
        runwareInstance = new RunwareService(data.apiKey);
        console.log("🚀 Runware initialisé depuis Supabase");
        return true;
      }
      
      console.log("⚠️ Runware non disponible (pas de clé API)");
      return false;
    } catch (error) {
      console.error("❌ Erreur initialisation Runware:", error);
      return false;
    }
  }

  /**
   * Génère une image avec le meilleur provider disponible
   * Runware pour la fidélité, DALL-E en fallback
   */
  static async generateImage(options: ImageGenerationOptions): Promise<string> {
    const prompt = this.enhancePromptForFidelity(options.prompt);
    
    // Essayer Runware en premier si disponible et demandé
    if (options.provider === 'runware' || (!options.provider && runwareInstance)) {
      try {
        console.log('🎨 Génération avec Runware (fidélité maximale):', prompt);
        
        const [width, height] = this.parseSizeForRunware(options.size || '1024x1024');
        const result = await runwareInstance!.generateImage({
          positivePrompt: prompt,
          width,
          height,
          CFGScale: options.cfgScale || 12, // Fidélité élevée
          steps: options.steps || 25, // Plus de détails
          scheduler: options.scheduler || "DPMSolverMultistepScheduler",
          promptWeighting: "compel", // Meilleur suivi du prompt
          seed: options.seed,
        });
        
        if (result.imageURL) {
          return result.imageURL;
        }
      } catch (error) {
        console.error('❌ Erreur Runware, fallback vers DALL-E:', error);
      }
    }

    // Fallback vers DALL-E
    console.log('🎨 Génération avec DALL-E 3:', prompt);
    const { data, error } = await supabase.functions.invoke('dalle-image', {
      body: {
        prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'hd'
      }
    });

    if (error) {
      console.error('❌ Erreur génération DALL-E:', error);
      throw new Error(`Échec de génération d'image: ${error.message}`);
    }

    if (!data?.image) {
      throw new Error('Aucune image retournée');
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
   * Améliore les prompts pour une fidélité maximale aux descriptions
   */
  static enhancePromptForFidelity(prompt: string): string {
    // Si le prompt est déjà détaillé, le conserver
    if (prompt.length > 50 && prompt.includes(',')) {
      return prompt;
    }
    
    // Ajouter des détails pour améliorer la fidélité
    const enhancements = [
      "highly detailed",
      "realistic",
      "sharp focus", 
      "professional quality",
      "8k resolution"
    ];
    
    return `${prompt}, ${enhancements.join(', ')}`;
  }

  /**
   * Convertit les tailles DALL-E vers les dimensions Runware
   */
  static parseSizeForRunware(size: string): [number, number] {
    switch (size) {
      case '1792x1024': return [1792, 1024];
      case '1024x1792': return [1024, 1792]; 
      default: return [1024, 1024];
    }
  }
}