import { supabase } from '@/integrations/supabase/client';

export interface MultimodalAnalysisOptions {
  images?: string[]; // Base64 data URLs
  videos?: string[]; // Video URLs or base64
  pdfs?: string[];   // PDF base64 data
  prompt: string;
  model?: 'gpt-4o' | 'gemini-2.5-flash' | 'claude-3-5-sonnet';
  compareMode?: boolean; // Pour comparer plusieurs images
}

export interface OCROptions {
  image: string;
  extractTables?: boolean;
  extractCharts?: boolean;
  language?: string;
}

/**
 * Service multimodal avancé pour analyse d'images, vidéos, PDF et comparaisons
 */
export class MultimodalService {

  /**
   * Analyse multimodale avancée avec support vidéo, comparaisons, OCR structuré
   */
  static async analyzeMultimodal(options: MultimodalAnalysisOptions): Promise<string> {
    const { images = [], videos = [], pdfs = [], prompt, model = 'gpt-4o', compareMode = false } = options;

    console.log('🔍 Analyse multimodale:', { 
      images: images.length, 
      videos: videos.length, 
      pdfs: pdfs.length, 
      compareMode 
    });

    try {
      // Traitement des vidéos (extraction de frames)
      const processedVideos = await Promise.all(
        videos.map(async (video) => await this.extractVideoFrames(video))
      );

      // Traitement des PDF (extraction de texte et images)
      const processedPDFs = await Promise.all(
        pdfs.map(async (pdf) => await this.extractPDFContent(pdf))
      );

      // Construire le prompt enrichi
      const enhancedPrompt = this.buildEnhancedPrompt({
        originalPrompt: prompt,
        images,
        videoFrames: processedVideos.flat(),
        pdfContent: processedPDFs,
        compareMode
      });

      // Sélectionner le meilleur modèle pour la tâche
      const selectedModel = this.selectBestModelForTask(model, { images, videos, pdfs, compareMode });

      // Appel API avec le modèle sélectionné
      if (selectedModel.includes('gemini')) {
        return await this.analyzeWithGemini(enhancedPrompt, [...images, ...processedVideos.flat()]);
      } else if (selectedModel.includes('claude')) {
        return await this.analyzeWithClaude(enhancedPrompt, [...images, ...processedVideos.flat()]);
      } else {
        return await this.analyzeWithOpenAI(enhancedPrompt, [...images, ...processedVideos.flat()]);
      }

    } catch (error) {
      console.error('❌ Erreur analyse multimodale:', error);
      throw error;
    }
  }

  /**
   * OCR avancé avec extraction de structure (tableaux, graphiques)
   */
  static async advancedOCR(options: OCROptions): Promise<{
    text: string;
    tables?: any[];
    charts?: any[];
    structure: any;
  }> {
    const { image, extractTables = true, extractCharts = true, language = 'fr' } = options;

    console.log('📝 OCR avancé avec extraction de structure');

    try {
      // Appel à GPT-4o pour OCR structuré
      const { data, error } = await supabase.functions.invoke('vision-analyze', {
        body: {
          image,
          prompt: `Perform advanced OCR on this image with the following requirements:
          - Extract ALL text content
          - Identify and extract table structures${extractTables ? ' (return as JSON format)' : ''}
          - Identify and describe charts/graphs${extractCharts ? ' (describe data and structure)' : ''}
          - Maintain document structure and hierarchy
          - Language: ${language}
          
          Return the result in this JSON format:
          {
            "text": "full extracted text",
            "tables": [{"headers": [], "rows": []}],
            "charts": [{"type": "", "description": "", "data": ""}],
            "structure": {"sections": [], "headings": []}
          }`
        }
      });

      if (error) throw error;

      try {
        const result = JSON.parse(data.generatedText);
        return result;
      } catch {
        // Si pas JSON, retourner format simple
        return {
          text: data.generatedText,
          structure: { sections: [], headings: [] }
        };
      }

    } catch (error) {
      console.error('❌ Erreur OCR avancé:', error);
      throw error;
    }
  }

  /**
   * Comparaison intelligente de plusieurs images
   */
  static async compareImages(images: string[], prompt: string): Promise<string> {
    if (images.length < 2) {
      throw new Error('Au moins 2 images sont nécessaires pour la comparaison');
    }

    console.log(`🔍 Comparaison de ${images.length} images`);

    const comparePrompt = `Compare these ${images.length} images in detail:

${prompt}

Please provide:
1. Similarities between the images
2. Key differences 
3. Unique elements in each image
4. Overall analysis and insights
5. Which image best matches the criteria (if applicable)

Be thorough and specific in your comparison.`;

    return await this.analyzeMultimodal({
      images,
      prompt: comparePrompt,
      compareMode: true,
      model: 'gpt-4o' // GPT-4o excellent pour les comparaisons
    });
  }

  /**
   * Traitement par lot de fichiers
   */
  static async batchProcess(files: { type: 'image' | 'pdf'; data: string; name?: string }[], prompt: string): Promise<Array<{ name: string; result: string }>> {
    console.log(`📦 Traitement par lot de ${files.length} fichiers`);

    const results = await Promise.allSettled(
      files.map(async (file, index) => {
        const name = file.name || `File_${index + 1}`;
        
        if (file.type === 'image') {
          const result = await this.analyzeMultimodal({
            images: [file.data],
            prompt: `${prompt}\n\nFile: ${name}`,
          });
          return { name, result };
        } else {
          const result = await this.analyzeMultimodal({
            pdfs: [file.data],
            prompt: `${prompt}\n\nFile: ${name}`,
          });
          return { name, result };
        }
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<{ name: string; result: string }> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  // Méthodes privées

  private static async extractVideoFrames(videoUrl: string): Promise<string[]> {
    // Pour l'instant, retourner une frame d'exemple
    // Dans une vraie implémentation, utiliser un service de processing vidéo
    console.log('🎬 Extraction frames vidéo (placeholder)');
    return []; // À implémenter avec un service vidéo
  }

  private static async extractPDFContent(pdfBase64: string): Promise<{ text: string; images: string[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('file-analyze', {
        body: {
          fileBase64: pdfBase64,
          fileName: 'document.pdf',
          mime: 'application/pdf',
          prompt: 'Extract all text content and identify any embedded images'
        }
      });

      if (error) throw error;

      return {
        text: data.generatedText || '',
        images: [] // À améliorer pour extraire les images du PDF
      };
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      return { text: '', images: [] };
    }
  }

  private static buildEnhancedPrompt(options: {
    originalPrompt: string;
    images: string[];
    videoFrames: string[];
    pdfContent: Array<{ text: string; images: string[] }>;
    compareMode: boolean;
  }): string {
    let enhancedPrompt = options.originalPrompt;

    if (options.compareMode && (options.images.length > 1 || options.videoFrames.length > 1)) {
      enhancedPrompt = `COMPARISON MODE: ${enhancedPrompt}\n\nPlease compare and contrast the provided visual content.`;
    }

    if (options.pdfContent.length > 0) {
      const pdfTexts = options.pdfContent.map(pdf => pdf.text).join('\n---\n');
      enhancedPrompt += `\n\nPDF Content:\n${pdfTexts}`;
    }

    return enhancedPrompt;
  }

  private static selectBestModelForTask(preferredModel: string, context: any): string {
    // Gemini excellent pour les vidéos et grand contexte
    if (context.videos?.length > 0) {
      return 'gemini-2.5-flash';
    }
    
    // Claude excellent pour l'analyse de texte et PDF
    if (context.pdfs?.length > 0) {
      return 'claude-3-5-sonnet-20241022';
    }
    
    // GPT-4o excellent pour les comparaisons d'images
    if (context.compareMode) {
      return 'gpt-4o';
    }
    
    return preferredModel;
  }

  private static async analyzeWithGemini(prompt: string, images: string[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: {
        messages: [
          { role: 'user', content: prompt }
        ],
        model: 'gemini-2.5-flash',
        images // Gemini supporte les images
      }
    });

    if (error) throw error;
    return data.generatedText || data.content || '';
  }

  private static async analyzeWithClaude(prompt: string, images: string[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('claude-chat', {
      body: {
        messages: [
          { role: 'user', content: prompt }
        ],
        model: 'claude-3-5-sonnet-20241022',
        images // Claude supporte les images
      }
    });

    if (error) throw error;
    return data.generatedText || data.content || '';
  }

  private static async analyzeWithOpenAI(prompt: string, images: string[]): Promise<string> {
    if (images.length > 0) {
      // Utiliser vision-analyze pour GPT-4o avec images
      const { data, error } = await supabase.functions.invoke('vision-analyze', {
        body: {
          image: images[0], // Pour l'instant, prendre la première image
          prompt
        }
      });

      if (error) throw error;
      return data.generatedText || '';
    } else {
      // Chat normal sans images
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            { role: 'user', content: prompt }
          ],
          model: 'gpt-4o'
        }
      });

      if (error) throw error;
      return data.content || '';
    }
  }
}