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
  sourceType?: 'text' | 'figma' | 'screenshot';
  sourceUrl?: string;
}

export interface GeneratedApp {
  html: string;
  css: string;
  javascript: string;
  // React files
  packageJson?: string;
  appJsx?: string;
  mainJsx?: string;
  indexHtml?: string;
  databaseSchema?: string;
  images: Array<{
    url: string;
    alt: string;
    usage: string; // hero, gallery, testimonial, etc.
  }>;
  features: string[];
  deploymentInstructions: string;
  framework: 'react' | 'vanilla';
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

      // 2. Générer le code de l'application (React par défaut)
      const appCode = await this.generateReactAppCode(prompt, finalOptions, images);

      // 3. Générer le schéma de base de données si nécessaire
      const databaseSchema = finalOptions.includeDatabase ? 
        await this.generateDatabaseSchema(finalOptions) : undefined;

      return {
        ...appCode,
        images,
        databaseSchema,
        features: this.extractFeatures(finalOptions),
        deploymentInstructions: this.generateDeploymentInstructions(finalOptions),
        framework: 'react' as const
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
      colorScheme: 'ai-generated',
      includeAuth: true,
      authProviders: ['email'],
      includeDatabase: true,
      includeStripe: false,
      includeAnalytics: false,
      includeStorage: false,
      includeRealtime: false,
      includeNotifications: false,
      includeCMS: false,
      includeChat: false,
      seoOptimized: true,
      pwaEnabled: false
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
   * Génère le code React de l'application avec IA
   */
  private static async generateReactAppCode(prompt: string, options: AppGenerationOptions, images: GeneratedApp['images']): Promise<Pick<GeneratedApp, 'html' | 'css' | 'javascript' | 'packageJson' | 'appJsx' | 'mainJsx' | 'indexHtml'>> {
    const enhancedPrompt = this.buildReactEnhancedPrompt(prompt, options, images);

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          {
            role: 'system',
            content: this.getReactSystemPrompt()
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
      throw new Error(`Erreur génération code React: ${error.message}`);
    }

    if (!data?.generatedText) {
      throw new Error('Aucun contenu généré par l\'IA');
    }

    // Parser la réponse pour extraire les fichiers React
    return this.parseReactGeneratedCode(data.generatedText);
  }

  /**
   * Construit un prompt amélioré pour la génération d'app React
   */
  private static buildReactEnhancedPrompt(prompt: string, options: AppGenerationOptions, images: GeneratedApp['images']): string {
    const imageUrls = images.map((img, i) => `${img.usage}: ${img.url}`).join('\n');
    
    const technicalFeatures = [];
    if (options.includeAuth) technicalFeatures.push(`- Authentification (${options.authProviders?.join(', ') || 'email'})`);
    if (options.includeDatabase) technicalFeatures.push('- Base de données Supabase avec RLS');
    if (options.includeStripe) technicalFeatures.push('- Intégration Stripe pour paiements');
    if (options.includeAnalytics) technicalFeatures.push('- Analytics et tracking');
    if (options.includeStorage) technicalFeatures.push('- Stockage de fichiers');
    if (options.includeRealtime) technicalFeatures.push('- Fonctionnalités temps réel');
    if (options.includeNotifications) technicalFeatures.push('- Système de notifications');
    if (options.includeCMS) technicalFeatures.push('- CMS intégré');
    if (options.includeChat) technicalFeatures.push('- Chat/messagerie');
    if (options.seoOptimized) technicalFeatures.push('- Optimisation SEO avancée');
    if (options.pwaEnabled) technicalFeatures.push('- Progressive Web App (PWA)');

    return `
Génère une application React complète et moderne pour: ${prompt}

SPÉCIFICATIONS BUSINESS:
- Type: ${options.type}
- Business: ${options.businessName}
- Industrie: ${options.industry}
- Style: ${options.style}
- Couleurs: ${options.colorScheme === 'ai-generated' ? 'Palette générée par IA selon l\'industrie' : options.colorScheme}

IMAGES DISPONIBLES:
${imageUrls}

EXIGENCES TECHNIQUES:
- React 18+ avec hooks et composants fonctionnels
- Vite comme bundler et dev server
- Tailwind CSS pour le styling
- TypeScript/JSX moderne
- Design mobile-first responsive
- Performance optimisée (Core Web Vitals)
- Cross-browser compatibility

FONCTIONNALITÉS REQUISES:
${technicalFeatures.join('\n')}

DESIGN REQUIREMENTS:
- Interface utilisateur moderne et intuitive
- Animations et micro-interactions fluides
- Palette de couleurs cohérente selon l'industrie
- Typographie optimisée pour la lisibilité
- Layout responsive avec breakpoints appropriés
- Loading states et feedback utilisateur

STRUCTURE DE PAGE:
- Header avec navigation et CTA
- Section héro avec value proposition
- Sections features/services
- Témoignages clients si approprié
- Section pricing si SaaS
- Footer avec liens importants

UTILISE les images fournies aux endroits appropriés et optimise pour ${options.industry}.

Réponds avec le format exact:

\`\`\`package.json
[package.json avec toutes les dépendances React, Vite, Tailwind]
\`\`\`

\`\`\`index.html
[index.html minimal pour Vite avec React]
\`\`\`

\`\`\`main.jsx
[Point d'entrée React avec ReactDOM.createRoot]
\`\`\`

\`\`\`app.jsx
[Composant App principal avec tous les composants]
\`\`\`

\`\`\`css
[Styles Tailwind et CSS personnalisés si nécessaire]
\`\`\`
    `;
  }

  /**
   * Prompt système pour la génération d'applications React
   */
  private static getReactSystemPrompt(): string {
    return `
Tu es un expert en développement React moderne spécialisé dans la création d'applications web performantes.

EXPERTISE:
- React 18+ avec hooks et functional components
- Vite pour le développement et build
- Tailwind CSS pour le styling moderne
- TypeScript/JSX avec meilleures pratiques
- Design responsive mobile-first
- UX/UI optimisée pour la conversion
- SEO et performance web
- Architecture composants modulaire

PRINCIPES DE CONCEPTION:
- Composants réutilisables et maintenables
- State management avec hooks natifs
- Props drilling évité avec context si nécessaire
- Performance optimisée (lazy loading, memo)
- Accessibilité (ARIA, semantic HTML)
- Design system cohérent
- Animations fluides et subtiles

GÉNÉRATION DE CODE:
- Code production-ready avec TypeScript
- Composants bien structurés et documentés
- Gestion d'état moderne avec hooks
- CSS-in-JS avec Tailwind
- Bundling optimisé avec Vite
- Standards React modernes

Génère TOUJOURS du code React moderne, performant et maintenable.
    `;
  }

  /**
   * Parse le code React généré par l'IA
   */
  private static parseReactGeneratedCode(content: string): Pick<GeneratedApp, 'html' | 'css' | 'javascript' | 'packageJson' | 'appJsx' | 'mainJsx' | 'indexHtml'> {
    const packageJsonMatch = content.match(/```(?:package\.json|json)\n([\s\S]*?)\n```/);
    const indexHtmlMatch = content.match(/```(?:index\.html|html)\n([\s\S]*?)\n```/);
    const mainJsxMatch = content.match(/```(?:main\.jsx|jsx)\n([\s\S]*?)\n```/);
    const appJsxMatch = content.match(/```(?:app\.jsx|jsx|react)\n([\s\S]*?)\n```/);
    const cssMatch = content.match(/```css\n([\s\S]*?)\n```/);

    // Pour compatibilité avec WebPreview, on combine les fichiers React
    const combinedHtml = indexHtmlMatch?.[1]?.trim() || `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tailwindcss@3.3.0/dist/tailwind.min.js"></script>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;

    const combinedJs = `
// React App Component
${appJsxMatch?.[1]?.trim() || 'const App = () => <div>React App</div>;'}

// Mount React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
    `;

    return {
      html: combinedHtml,
      css: cssMatch?.[1]?.trim() || '/* Tailwind CSS sera chargé via CDN */',
      javascript: combinedJs,
      packageJson: packageJsonMatch?.[1]?.trim(),
      indexHtml: indexHtmlMatch?.[1]?.trim(),
      mainJsx: mainJsxMatch?.[1]?.trim(),
      appJsx: appJsxMatch?.[1]?.trim()
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
      'Application React moderne',
      'Design responsive mobile-first',
      'Interface utilisateur intuitive',
      'Navigation fluide',
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
INSTRUCTIONS DE DÉPLOIEMENT REACT + VITE

1. PRÉPARATION:
   - Téléchargez tous les fichiers générés
   - Créez un nouveau projet avec: npm create vite@latest mon-app -- --template react
   - Remplacez les fichiers générés dans le projet
   - Installez les dépendances: npm install

2. DÉVELOPPEMENT LOCAL:
   - npm run dev (démarre le serveur de développement Vite)
   - npm run build (génère la version de production)
   - npm run preview (aperçu de la version de production)

3. NETLIFY DEPLOYMENT:
   - Connectez votre repository à Netlify
   - Build command: npm run build
   - Publish directory: dist
   - Variables d'environnement: voir section Supabase

4. SUPABASE CONFIGURATION:
   ${options.includeDatabase ? `
   - Créez un projet Supabase
   - Exécutez le schéma SQL fourni
   - Configurez l'authentification
   - Ajoutez les variables d'env dans Netlify:
     * VITE_SUPABASE_URL=votre_url
     * VITE_SUPABASE_ANON_KEY=votre_cle
   ` : '- Aucune configuration base de données requise'}

5. DOMAINE PERSONNALISÉ:
   - Configurez votre domaine dans Netlify
   - Certificat SSL automatique

6. OPTIMISATIONS POST-DÉPLOIEMENT:
   - Google Analytics
   - Monitoring des performances
   - SEO final check
   - Tests sur différents appareils
   - Lazy loading des composants si nécessaire

Votre application React sera accessible à: https://votre-app.netlify.app
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
