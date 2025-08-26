import { supabase } from "@/integrations/supabase/client";

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'hd' | 'standard';
  provider?: 'dalle' | 'huggingface' | 'stable-diffusion' | 'auto';
  
  // 🎯 CONTRÔLE DE FIDÉLITÉ AU PROMPT
  preserveOriginalPrompt?: boolean; // Utiliser les instructions exactes
  promptFidelity?: number; // 0-100, contrôle les améliorations automatiques
  autoTranslate?: boolean; // Traduire automatiquement le français
  
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

/**
 * Service centralisé pour toutes les opérations d'images
 * Supporte DALL-E (OpenAI) et Hugging Face pour plus de variété
 */
export class ImageService {
  
  /**
   * Génère une image avec le meilleur provider disponible
   * Auto-sélection intelligente basée sur le type de demande
   */
  static async generateImage(options: ImageGenerationOptions): Promise<string> {
    console.log('🎨 Image generation request:', options);
    
    // 🎯 RESPECT FIDÈLE DES INSTRUCTIONS
    let prompt = options.prompt;
    
    try {
      // Traduction française intelligente si demandée
      if (options.autoTranslate !== false) {
        prompt = this.intelligentTranslation(prompt);
      }
      
      // Améliorations contextuelles optionnelles
      if (!options.preserveOriginalPrompt) {
        const fidelityLevel = options.promptFidelity ?? 50; // 50% par défaut
        prompt = this.enhancePromptWithFidelity(prompt, fidelityLevel);
      }
    } catch (processingError) {
      console.warn('⚠️ Prompt processing failed, using original:', processingError);
      prompt = options.prompt; // Fallback vers le prompt original
    }
    
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
   * 🎯 TRADUCTION FRANÇAISE INTELLIGENTE
   */
  static intelligentTranslation(prompt: string): string {
    // Dictionnaire français-anglais étendu pour les termes courants
    const commonTranslations = {
      // Animaux
      'chat': 'cat', 'chien': 'dog', 'oiseau': 'bird', 'poisson': 'fish', 'cheval': 'horse',
      
      // Nature & paysages
      'paysage': 'landscape', 'montagne': 'mountain', 'océan': 'ocean', 'mer': 'sea',
      'forêt': 'forest', 'arbre': 'tree', 'fleur': 'flower', 'jardin': 'garden',
      
      // Architecture
      'maison': 'house', 'château': 'castle', 'église': 'church', 'ville': 'city',
      
      // Couleurs
      'rouge': 'red', 'bleu': 'blue', 'vert': 'green', 'jaune': 'yellow',
      'noir': 'black', 'blanc': 'white', 'gris': 'gray', 'rose': 'pink',
      
      // Style & qualité
      'beau': 'beautiful', 'joli': 'pretty', 'magnifique': 'magnificent',
      'réaliste': 'realistic', 'artistique': 'artistic', 'moderne': 'modern'
    };
    
    let translatedPrompt = prompt;
    
    // Appliquer les traductions mot par mot
    Object.entries(commonTranslations).forEach(([french, english]) => {
      const regex = new RegExp(`\\b${french}\\b`, 'gi');
      translatedPrompt = translatedPrompt.replace(regex, english);
    });
    
    return translatedPrompt;
  }

  /**
   * 🎯 AMÉLIORATIONS CONTEXTUELLES AVEC CONTRÔLE DE FIDÉLITÉ
   */
  static enhancePromptWithFidelity(prompt: string, fidelityLevel: number): string {
    // Si fidélité 100%, retourner le prompt original
    if (fidelityLevel >= 100) {
      return prompt;
    }
    
    // Détecter l'intention du prompt (minimaliste, détaillé, artistique)
    const isMinimalist = /simple|minimal|clean|basic/i.test(prompt);
    
    // Respecter l'intention minimaliste
    if (isMinimalist && fidelityLevel > 30) {
      return prompt; // Ne pas sur-améliorer les prompts minimalistes
    }
    
    let enhancedPrompt = prompt;
    
    // Améliorations graduelles selon le niveau de fidélité
    if (fidelityLevel < 70 && !isMinimalist) {
      // Améliorations légères (30-69%)
      const lightEnhancements = ['high quality', 'professional'];
      enhancedPrompt += `, ${lightEnhancements.join(', ')}`;
    }
    
    if (fidelityLevel < 40 && !isMinimalist) {
      // Améliorations moyennes (0-39%)
      const mediumEnhancements = ['detailed', 'sharp focus'];
      enhancedPrompt += `, ${mediumEnhancements.join(', ')}`;
    }
    
    return enhancedPrompt;
  }

  /**
   * Sélectionne automatiquement le meilleur provider selon le type de demande
   */
  static selectBestProvider(prompt: string): 'dalle' | 'huggingface' | 'stable-diffusion' {
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
    
    // DALL-E en fallback
    return 'dalle';
  }
}