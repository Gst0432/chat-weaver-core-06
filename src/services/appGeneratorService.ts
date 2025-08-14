import { supabase } from "@/integrations/supabase/client";
import { FreeImageService } from "./freeImageService";

export interface AppGenerationOptions {
  type: 'saas' | 'ecommerce' | 'portfolio' | 'blog' | 'landing';
  businessName: string;
  description: string;
  industry: string;
  style?: 'modern' | 'classic' | 'minimalist' | 'bold' | 'gradient' | 'glass';
  colorScheme?: 'ai-generated' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | 'custom';
  includeAuth?: boolean;
  authProviders?: ('email' | 'google' | 'github' | 'facebook')[];
  includeDatabase?: boolean;
  includeStripe?: boolean;
  includeAnalytics?: boolean;
  includeStorage?: boolean;
  includeRealtime?: boolean;
  includeNotifications?: boolean;
  includeCMS?: boolean;
  includeChat?: boolean;
  seoOptimized?: boolean;
  pwaEnabled?: boolean;
}

export interface GeneratedApp {
  html: string;
  css: string;
  javascript: string;
  databaseSchema?: string;
  images: Array<{
    url: string;
    alt: string;
    usage: string; // hero, gallery, testimonial, etc.
  }>;
  features: string[];
  deploymentInstructions: string;
}

/**
 * Service pour générer des applications complètes avec IA
 */
export class AppGeneratorService {
  
  /**
   * Génère une application complète basée sur les options
   */
  static async generateApp(prompt: string, options?: Partial<AppGenerationOptions>): Promise<GeneratedApp> {
    // Analyser le prompt pour détecter le type d'app
    const detectedOptions = this.analyzePrompt(prompt);
    const finalOptions = { ...detectedOptions, ...options };

    console.log('🏗️ Génération app:', finalOptions);

    try {
      // 1. Générer les images contextuelles
      const images = await this.generateContextualImages(finalOptions);

      // 2. Générer le code de l'application
      const appCode = await this.generateAppCode(prompt, finalOptions, images);

      // 3. Générer le schéma de base de données si nécessaire
      const databaseSchema = finalOptions.includeDatabase ? 
        await this.generateDatabaseSchema(finalOptions) : undefined;

      return {
        ...appCode,
        images,
        databaseSchema,
        features: this.extractFeatures(finalOptions),
        deploymentInstructions: this.generateDeploymentInstructions(finalOptions)
      };

    } catch (error) {
      console.error('Erreur génération app:', error);
      throw new Error(`Échec génération application: ${error}`);
    }
  }

  /**
   * Analyse le prompt pour déterminer le type d'app et les options
   */
  private static analyzePrompt(prompt: string): AppGenerationOptions {
    const promptLower = prompt.toLowerCase();
    
    // Détection du type d'application
    let type: AppGenerationOptions['type'] = 'saas';
    if (promptLower.includes('e-commerce') || promptLower.includes('boutique') || promptLower.includes('vente')) {
      type = 'ecommerce';
    } else if (promptLower.includes('portfolio') || promptLower.includes('cv')) {
      type = 'portfolio';
    } else if (promptLower.includes('blog') || promptLower.includes('article')) {
      type = 'blog';
    } else if (promptLower.includes('landing') || promptLower.includes('présentation')) {
      type = 'landing';
    }

    // Extraction du nom du business
    const businessNameMatch = prompt.match(/(?:saas|site|app|plateforme)\s+(?:de\s+|pour\s+)?([^,.!?]+)/i);
    const businessName = businessNameMatch?.[1]?.trim() || 'Mon Business';

    // Détection de l'industrie
    let industry = 'technologie';
    const industries = {
      'voiture': ['voiture', 'automobile', 'auto', 'véhicule'],
      'restaurant': ['restaurant', 'food', 'cuisine', 'repas'],
      'immobilier': ['immobilier', 'maison', 'appartement', 'propriété'],
      'fitness': ['gym', 'fitness', 'sport', 'musculation'],
      'santé': ['santé', 'médical', 'hôpital', 'clinique'],
      'éducation': ['école', 'éducation', 'formation', 'cours']
    };

    for (const [key, keywords] of Object.entries(industries)) {
      if (keywords.some(keyword => promptLower.includes(keyword))) {
        industry = key;
        break;
      }
    }

    return {
      type,
      businessName,
      description: prompt,
      industry,
      style: 'modern',
      colorScheme: 'blue',
      includeAuth: true,
      includeDatabase: true,
      includeCMS: false
    };
  }

  /**
   * Génère des images contextuelles pour l'application
   */
  private static async generateContextualImages(options: AppGenerationOptions): Promise<GeneratedApp['images']> {
    try {
      const contextQuery = `${options.industry} ${options.businessName} ${options.type}`;
      const freeImages = await FreeImageService.getImagesForContext(contextQuery, 6);

      return freeImages.map((img, index) => ({
        url: img.url,
        alt: img.alt,
        usage: this.getImageUsage(index, options.type)
      }));
    } catch (error) {
      console.warn('Erreur génération images, utilisation d\'images par défaut:', error);
      return this.getFallbackImages(options);
    }
  }

  /**
   * Détermine l'usage de chaque image selon son index et le type d'app
   */
  private static getImageUsage(index: number, type: AppGenerationOptions['type']): string {
    const usageMap = {
      saas: ['hero', 'feature-1', 'feature-2', 'testimonial', 'team', 'cta'],
      ecommerce: ['hero', 'product-1', 'product-2', 'product-3', 'category', 'promotion'],
      portfolio: ['hero', 'project-1', 'project-2', 'project-3', 'about', 'contact'],
      blog: ['hero', 'post-1', 'post-2', 'post-3', 'author', 'category'],
      landing: ['hero', 'benefit-1', 'benefit-2', 'testimonial', 'team', 'cta']
    };

    return usageMap[type][index] || 'generic';
  }

  /**
   * Images de fallback si le service d'images échoue
   */
  private static getFallbackImages(options: AppGenerationOptions): GeneratedApp['images'] {
    return [
      { url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800', alt: 'Hero image', usage: 'hero' },
      { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', alt: 'Feature 1', usage: 'feature-1' },
      { url: 'https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=400', alt: 'Feature 2', usage: 'feature-2' }
    ];
  }

  /**
   * Génère le code de l'application avec IA
   */
  private static async generateAppCode(prompt: string, options: AppGenerationOptions, images: GeneratedApp['images']): Promise<Pick<GeneratedApp, 'html' | 'css' | 'javascript'>> {
    const enhancedPrompt = this.buildEnhancedPrompt(prompt, options, images);

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 4000
      }
    });

    if (error) {
      throw new Error(`Erreur génération code: ${error.message}`);
    }

    if (!data?.generatedText) {
      throw new Error('Aucun contenu généré par l\'IA');
    }

    // Parser la réponse pour extraire HTML, CSS, JS
    return this.parseGeneratedCode(data.generatedText);
  }

  /**
   * Construit un prompt amélioré pour la génération d'app
   */
  private static buildEnhancedPrompt(prompt: string, options: AppGenerationOptions, images: GeneratedApp['images']): string {
    const imageUrls = images.map((img, i) => `${img.usage}: ${img.url}`).join('\n');

    return `
Génère une application web complète pour: ${prompt}

SPÉCIFICATIONS:
- Type: ${options.type}
- Business: ${options.businessName}
- Industrie: ${options.industry}
- Style: ${options.style}
- Couleurs: ${options.colorScheme}

IMAGES DISPONIBLES:
${imageUrls}

EXIGENCES TECHNIQUES:
- HTML5 sémantique responsive
- CSS moderne avec Flexbox/Grid
- JavaScript vanilla moderne (ES6+)
- Design mobile-first
- Accessibility (ARIA labels)
- SEO optimisé (meta tags, structured data)

FONCTIONNALITÉS REQUISES:
${options.includeAuth ? '- Système d\'authentification (UI mockup)' : ''}
${options.includeDatabase ? '- Intégration base de données (forms)' : ''}
- Navigation responsive
- Section héro avec CTA
- Formulaire de contact
- Footer professionnel

UTILISE les images fournies aux endroits appropriés.
RÉPONDS avec le format exact:

\`\`\`html
[Code HTML complet]
\`\`\`

\`\`\`css
[Code CSS complet]
\`\`\`

\`\`\`javascript
[Code JavaScript complet]
\`\`\`
    `;
  }

  /**
   * Prompt système pour la génération d'applications
   */
  private static getSystemPrompt(): string {
    return `
Tu es un expert en développement web full-stack spécialisé dans la création d'applications modernes.

EXPERTISE:
- HTML5 sémantique et accessible
- CSS moderne (Flexbox, Grid, animations)
- JavaScript ES6+ vanilla
- Design responsive mobile-first
- UX/UI optimisée pour la conversion
- SEO et performance web

PRINCIPES DE CONCEPTION:
- Design épuré et professionnel
- Palette de couleurs cohérente
- Typographie moderne et lisible
- Espacement harmonieux
- Interactions subtiles et fluides
- Compatibilité cross-browser

GÉNÉRATION DE CODE:
- Code propre et bien structuré
- Commentaires explicatifs
- Performance optimisée
- Standards web modernes
- Progressive enhancement

Génère TOUJOURS du code production-ready avec les meilleures pratiques.
    `;
  }

  /**
   * Parse le code généré par l'IA
   */
  private static parseGeneratedCode(content: string): Pick<GeneratedApp, 'html' | 'css' | 'javascript'> {
    const htmlMatch = content.match(/```html\n([\s\S]*?)\n```/);
    const cssMatch = content.match(/```css\n([\s\S]*?)\n```/);
    const jsMatch = content.match(/```javascript\n([\s\S]*?)\n```/);

    return {
      html: htmlMatch?.[1]?.trim() || '<h1>Erreur génération HTML</h1>',
      css: cssMatch?.[1]?.trim() || '/* Erreur génération CSS */',
      javascript: jsMatch?.[1]?.trim() || '// Erreur génération JavaScript'
    };
  }

  /**
   * Génère le schéma de base de données
   */
  private static async generateDatabaseSchema(options: AppGenerationOptions): Promise<string> {
    const prompt = `Génère un schéma de base de données PostgreSQL/Supabase pour une application ${options.type} dans l'industrie ${options.industry}. 

Inclus les tables principales avec:
- Clés primaires UUID
- Relations avec foreign keys
- Index pour les performances
- Row Level Security (RLS) policies
- Données de démonstration (INSERT)

Business: ${options.businessName}
Type: ${options.type}
Industrie: ${options.industry}

Réponds uniquement avec du SQL valide PostgreSQL.`;

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'user', content: prompt }
        ],
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 2000
      }
    });

    if (error) {
      console.error('Erreur génération schéma DB:', error);
      return '-- Erreur génération schéma de base de données';
    }

    if (!data?.generatedText) {
      throw new Error('Aucun schéma généré par l\'IA');
    }

    return data.generatedText;
  }

  /**
   * Extrait les fonctionnalités de l'app générée
   */
  private static extractFeatures(options: AppGenerationOptions): string[] {
    const baseFeatures = [
      'Design responsive mobile-first',
      'Interface utilisateur moderne',
      'Navigation intuitive',
      'Optimisé pour le SEO',
      'Performance optimisée'
    ];

    const typeFeatures = {
      saas: ['Dashboard utilisateur', 'Système de plans', 'Analytics'],
      ecommerce: ['Catalogue produits', 'Panier d\'achat', 'Processus de commande'],
      portfolio: ['Galerie projets', 'CV téléchargeable', 'Formulaire contact'],
      blog: ['Articles blog', 'Catégories', 'Commentaires'],
      landing: ['Page de vente', 'Call-to-actions', 'Formulaire leads']
    };

    const industryFeatures = {
      voiture: ['Recherche véhicules', 'Filtres avancés', 'Galerie photos'],
      restaurant: ['Menu digital', 'Réservations', 'Commandes en ligne'],
      immobilier: ['Recherche propriétés', 'Carte interactive', 'Visites virtuelles']
    };

    return [
      ...baseFeatures,
      ...(typeFeatures[options.type] || []),
      ...(industryFeatures[options.industry as keyof typeof industryFeatures] || [])
    ];
  }

  /**
   * Génère les instructions de déploiement
   */
  private static generateDeploymentInstructions(options: AppGenerationOptions): string {
    return `
INSTRUCTIONS DE DÉPLOIEMENT

1. PRÉPARATION:
   - Téléchargez les fichiers générés
   - Créez un repository Git
   - Ajoutez les fichiers au repository

2. NETLIFY DEPLOYMENT:
   - Connectez votre repository à Netlify
   - Build command: (aucune pour HTML statique)
   - Publish directory: /
   - Variables d'environnement: voir section Supabase

3. SUPABASE CONFIGURATION:
   ${options.includeDatabase ? `
   - Créez un projet Supabase
   - Exécutez le schéma SQL fourni
   - Configurez l'authentification
   - Ajoutez les variables d'env dans Netlify:
     * VITE_SUPABASE_URL=votre_url
     * VITE_SUPABASE_ANON_KEY=votre_cle
   ` : '- Aucune configuration base de données requise'}

4. DOMAINE PERSONNALISÉ:
   - Configurez votre domaine dans Netlify
   - Certificat SSL automatique

5. OPTIMISATIONS POST-DÉPLOIEMENT:
   - Google Analytics
   - Monitoring des performances
   - SEO final check
   - Tests sur différents appareils

Votre application sera accessible à: https://votre-app.netlify.app
    `;
  }

  /**
   * Détecte si un message demande la génération d'une app complète
   */
  static isAppGenerationRequest(message: string): boolean {
    const appKeywords = [
      'saas', 'application', 'site web', 'plateforme', 'système',
      'crée moi', 'génère', 'développe', 'construis',
      'e-commerce', 'boutique', 'portfolio', 'blog',
      'complet', 'entier', 'full', 'avec base de données'
    ];

    const messageWords = message.toLowerCase().split(' ');
    const keywordMatches = appKeywords.filter(keyword => 
      messageWords.some(word => word.includes(keyword))
    );

    // Si au moins 2 mots-clés correspondent et le message est assez long (indique une demande complexe)
    return keywordMatches.length >= 2 && message.length > 50;
  }
}