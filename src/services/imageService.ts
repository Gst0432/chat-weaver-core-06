import { supabase } from "@/integrations/supabase/client";
import { RunwareService, type GenerateImageParams as RunwareParams } from "./runwareService";

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'hd' | 'standard';
  provider?: 'dalle' | 'runware' | 'huggingface' | 'stable-diffusion' | 'midjourney' | 'auto';
  // Options avancées Runware pour fidélité
  cfgScale?: number; // 1-20, plus élevé = plus fidèle
  steps?: number; // 1-50, plus élevé = plus de détails
  scheduler?: string;
  seed?: number;
  // Options Hugging Face
  model?: string; // 'black-forest-labs/FLUX.1-schnell', 'stabilityai/stable-diffusion-xl-base-1.0'
  width?: number;
  height?: number;
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
   * Auto-sélection intelligente basée sur le type de demande
   */
  static async generateImage(options: ImageGenerationOptions): Promise<string> {
    const prompt = this.enhancePromptForFidelity(options.prompt);
    let finalProvider = options.provider;
    
    // Auto-sélection du meilleur provider
    if (!finalProvider || finalProvider === 'auto') {
      finalProvider = this.selectBestProvider(prompt);
    }
    
    console.log(`🎨 Génération avec provider: ${finalProvider}`);
    
    // Essayer Hugging Face (FLUX.1, Stable Diffusion)
    if (finalProvider === 'huggingface' || finalProvider === 'stable-diffusion') {
      try {
        const model = finalProvider === 'stable-diffusion' 
          ? 'stabilityai/stable-diffusion-xl-base-1.0'
          : options.model || 'black-forest-labs/FLUX.1-schnell';
        
        const { data, error } = await supabase.functions.invoke('huggingface-image', {
          body: {
            prompt,
            model,
            width: options.width || 1024,
            height: options.height || 1024
          }
        });
        
        if (!error && data?.image) {
          console.log('✅ Image générée avec Hugging Face');
          return data.image;
        }
        console.warn('❌ Hugging Face failed, trying fallback');
      } catch (error) {
        console.error('❌ Erreur Hugging Face:', error);
      }
    }
    
    // Essayer Runware si disponible
    if (finalProvider === 'runware' || (!finalProvider && runwareInstance)) {
      try {
        console.log('🎨 Génération avec Runware (fidélité maximale):', prompt);
        
        const [width, height] = this.parseSizeForRunware(options.size || '1024x1024');
        const result = await runwareInstance!.generateImage({
          positivePrompt: prompt,
          width,
          height,
          CFGScale: options.cfgScale || 15, // Fidélité très élevée (augmenté de 12 à 15)
          steps: options.steps || 30, // Plus de détails (augmenté de 25 à 30)
          scheduler: options.scheduler || "DPMSolverMultistepScheduler", // Meilleur scheduler pour la qualité
          promptWeighting: "compel", // Meilleur suivi du prompt
          seed: options.seed,
          model: "runware:100@1", // Modèle optimisé
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
    // Si le prompt contient déjà des détails techniques, ne pas sur-améliorer
    if (prompt.length > 100 && (prompt.includes('detailed') || prompt.includes('realistic') || prompt.includes('8k'))) {
      return prompt;
    }
    
    // Techniques de prompt engineering pour une fidélité maximale
    const fidelityEnhancements = [
      "masterpiece",
      "best quality", 
      "ultra-detailed",
      "photorealistic",
      "perfect composition",
      "professional photography",
      "studio lighting"
    ];
    
    // Ajouter des détails spécifiques selon le type de contenu
    let enhancedPrompt = prompt;
    
    // Détection du type de contenu pour des améliorations ciblées
    if (/portrait|person|face|human/i.test(prompt)) {
      enhancedPrompt += ", perfect facial features, detailed eyes, natural skin texture";
    } else if (/landscape|nature|outdoor/i.test(prompt)) {
      enhancedPrompt += ", natural lighting, depth of field, atmospheric perspective";
    } else if (/art|painting|drawing/i.test(prompt)) {
      enhancedPrompt += ", fine art style, detailed brushwork, rich colors";
    }
    
    return `${enhancedPrompt}, ${fidelityEnhancements.join(', ')}, 8k uhd, sharp focus`;
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

  /**
   * Sélectionne automatiquement le meilleur provider selon le type de demande
   */
  static selectBestProvider(prompt: string): 'dalle' | 'runware' | 'huggingface' | 'stable-diffusion' {
    const lowerPrompt = prompt.toLowerCase();
    
    // Stable Diffusion pour art conceptuel et styles artistiques
    if (lowerPrompt.includes('art style') || lowerPrompt.includes('painting') || 
        lowerPrompt.includes('artistic') || lowerPrompt.includes('concept art')) {
      return 'stable-diffusion';
    }
    
    // FLUX.1 pour réalisme et photos
    if (lowerPrompt.includes('realistic') || lowerPrompt.includes('photo') || 
        lowerPrompt.includes('portrait') || lowerPrompt.includes('landscape')) {
      return 'huggingface';
    }
    
    // Runware pour fidélité maximale si disponible
    if (runwareInstance) {
      return 'runware';
    }
    
    // DALL-E en fallback
    return 'dalle';
  }

  /**
   * Génère plusieurs images avec différents providers
   */
  static async generateMultipleProviders(options: ImageGenerationOptions): Promise<{ provider: string; url: string }[]> {
    const providers = ['dalle', 'huggingface', 'runware'].filter(p => 
      p === 'runware' ? runwareInstance : true
    );
    
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        const url = await this.generateImage({ ...options, provider: provider as any });
        return { provider, url };
      })
    );
    
    return results
      .filter((r): r is PromiseFulfilledResult<{ provider: string; url: string }> => r.status === 'fulfilled')
      .map(r => r.value);
  }
}