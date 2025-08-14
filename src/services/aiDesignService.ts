import { supabase } from "@/integrations/supabase/client";

export interface AIGeneratedDesign {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    sizes: Record<string, string>;
  };
  spacing: Record<string, string>;
  animations: string[];
  gradients: string[];
  shadows: string[];
}

export class AIDesignService {
  
  /**
   * Génère un design complet avec l'IA basé sur l'industrie et le style
   */
  static async generateDesignSystem(
    industry: string,
    style: string,
    businessName: string
  ): Promise<AIGeneratedDesign> {
    const prompt = this.createDesignPrompt(industry, style, businessName);

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: this.getDesignSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'gpt-5-2025-08-07',
          max_completion_tokens: 2000
        }
      });

      if (error) {
        console.error('Erreur génération design IA:', error);
        return this.getFallbackDesign(industry, style);
      }

      if (!data?.generatedText) {
        console.warn('Pas de contenu généré, utilisation du design de fallback');
        return this.getFallbackDesign(industry, style);
      }

      return this.parseDesignResponse(data.generatedText, industry, style);

    } catch (error) {
      console.error('Erreur génération design:', error);
      return this.getFallbackDesign(industry, style);
    }
  }

  /**
   * Crée le prompt pour la génération de design
   */
  private static createDesignPrompt(industry: string, style: string, businessName: string): string {
    return `
Génère un système de design moderne et cohérent pour une application ${style} dans l'industrie ${industry} nommée "${businessName}".

SPÉCIFICATIONS REQUISES:
- Palette de couleurs harmonieuse avec couleurs primaire, secondaire, accent
- Typographie moderne avec polices Google Fonts
- Espacements cohérents 
- Animations subtiles et fluides
- Gradients élégants
- Ombres modernes

INDUSTRIE: ${industry}
- ${this.getIndustryContext(industry)}

STYLE: ${style}
- ${this.getStyleContext(style)}

Réponds UNIQUEMENT avec un JSON valide au format:
{
  "colorPalette": {
    "primary": "hsl(xxx, xx%, xx%)",
    "secondary": "hsl(xxx, xx%, xx%)",
    "accent": "hsl(xxx, xx%, xx%)",
    "background": "hsl(xxx, xx%, xx%)",
    "foreground": "hsl(xxx, xx%, xx%)",
    "muted": "hsl(xxx, xx%, xx%)"
  },
  "typography": {
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "sizes": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem"
    }
  },
  "spacing": {
    "xs": "0.25rem",
    "sm": "0.5rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem",
    "2xl": "3rem"
  },
  "animations": [
    "fadeIn 0.5s ease-out",
    "slideUp 0.3s ease-out",
    "bounce 2s infinite"
  ],
  "gradients": [
    "linear-gradient(135deg, primary, secondary)",
    "linear-gradient(45deg, accent, primary)"
  ],
  "shadows": [
    "0 1px 3px rgba(0,0,0,0.12)",
    "0 4px 12px rgba(primary, 0.15)",
    "0 8px 32px rgba(primary, 0.1)"
  ]
}
    `;
  }

  /**
   * Prompt système pour la génération de design
   */
  private static getDesignSystemPrompt(): string {
    return `
Tu es un expert en design UI/UX spécialisé dans la création de systèmes de design modernes et accessibles.

EXPERTISE:
- Théorie des couleurs et psychologie visuelle
- Typographie moderne et lisibilité
- Espacements harmonieux et hiérarchie visuelle
- Animations et micro-interactions
- Accessibilité et contraste WCAG
- Design systems et tokens

PRINCIPES:
- Cohérence visuelle absolue
- Accessibilité WCAG AA minimum
- Performance et lisibilité
- Évolutivité et maintenance
- Esthétique moderne et tendances actuelles

CONTRAINTES TECHNIQUES:
- Couleurs uniquement en format HSL
- Polices disponibles via Google Fonts
- Animations CSS performantes
- Gradients cross-browser
- Ombres subtiles et modernes

RÉPONDS TOUJOURS avec du JSON valide uniquement, sans texte d'explication.
    `;
  }

  /**
   * Contexte spécifique à chaque industrie
   */
  private static getIndustryContext(industry: string): string {
    const contexts: Record<string, string> = {
      'voiture': 'Couleurs dynamiques (rouge, noir, argent), modernité, vitesse, puissance',
      'restaurant': 'Couleurs appétissantes (rouge, orange, brun), chaleur, convivialité',
      'immobilier': 'Couleurs confiantes (bleu, gris, vert), sérieux, professionnalisme',
      'fitness': 'Couleurs énergiques (orange, vert, rouge), vitalité, motivation',
      'santé': 'Couleurs rassurantes (bleu, blanc, vert), propreté, confiance',
      'éducation': 'Couleurs inspirantes (bleu, jaune, vert), créativité, apprentissage',
      'technologie': 'Couleurs futuristes (bleu, violet, cyan), innovation, modernité',
      'finance': 'Couleurs sérieuses (bleu foncé, vert, or), stabilité, confiance'
    };
    return contexts[industry] || contexts['technologie'];
  }

  /**
   * Contexte spécifique à chaque style
   */
  private static getStyleContext(style: string): string {
    const contexts: Record<string, string> = {
      'modern': 'Lignes épurées, espaces généreux, couleurs vives, animations fluides',
      'classic': 'Élégance intemporelle, couleurs traditionnelles, typographie raffinée',
      'minimalist': 'Simplicité extrême, beaucoup d\'espace blanc, couleurs neutres',
      'bold': 'Couleurs vibrantes, contrastes forts, typographie impactante',
      'gradient': 'Dégradés colorés, effets visuels, couleurs transitionnelles',
      'glass': 'Transparence, flou, effets de verre, couleurs subtiles'
    };
    return contexts[style] || contexts['modern'];
  }

  /**
   * Parse la réponse de l'IA et valide le JSON
   */
  private static parseDesignResponse(response: string, industry: string, style: string): AIGeneratedDesign {
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Valider et compléter la structure
      return {
        colorPalette: {
          primary: parsed.colorPalette?.primary || 'hsl(233, 84%, 60%)',
          secondary: parsed.colorPalette?.secondary || 'hsl(240, 5%, 96%)',
          accent: parsed.colorPalette?.accent || 'hsl(250, 84%, 75%)',
          background: parsed.colorPalette?.background || 'hsl(0, 0%, 100%)',
          foreground: parsed.colorPalette?.foreground || 'hsl(240, 10%, 4%)',
          muted: parsed.colorPalette?.muted || 'hsl(240, 5%, 95%)',
          ...parsed.colorPalette
        },
        typography: {
          headingFont: parsed.typography?.headingFont || 'Inter',
          bodyFont: parsed.typography?.bodyFont || 'Inter',
          sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            ...parsed.typography?.sizes
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem',
          ...parsed.spacing
        },
        animations: parsed.animations || [
          'fadeIn 0.5s ease-out',
          'slideUp 0.3s ease-out'
        ],
        gradients: parsed.gradients || [
          'linear-gradient(135deg, var(--primary), var(--accent))'
        ],
        shadows: parsed.shadows || [
          '0 1px 3px rgba(0,0,0,0.12)',
          '0 4px 12px rgba(0,0,0,0.15)'
        ]
      };

    } catch (error) {
      console.error('Erreur parsing design IA:', error);
      return this.getFallbackDesign(industry, style);
    }
  }

  /**
   * Design de fallback en cas d'erreur
   */
  private static getFallbackDesign(industry: string, style: string): AIGeneratedDesign {
    // Palettes par industrie
    const industryPalettes: Record<string, any> = {
      'voiture': {
        primary: 'hsl(0, 85%, 55%)', // Rouge dynamique
        secondary: 'hsl(210, 15%, 25%)', // Gris foncé
        accent: 'hsl(45, 100%, 65%)', // Doré
      },
      'restaurant': {
        primary: 'hsl(15, 85%, 55%)', // Orange chaleureux
        secondary: 'hsl(25, 30%, 20%)', // Brun
        accent: 'hsl(60, 80%, 60%)', // Jaune
      },
      'immobilier': {
        primary: 'hsl(210, 75%, 45%)', // Bleu professionnel
        secondary: 'hsl(200, 15%, 35%)', // Gris bleuté
        accent: 'hsl(140, 60%, 45%)', // Vert confiance
      },
      'fitness': {
        primary: 'hsl(120, 70%, 45%)', // Vert énergique
        secondary: 'hsl(30, 85%, 55%)', // Orange motivation
        accent: 'hsl(340, 75%, 55%)', // Rouge passion
      },
      'default': {
        primary: 'hsl(233, 84%, 60%)',
        secondary: 'hsl(240, 5%, 96%)',
        accent: 'hsl(250, 84%, 75%)',
      }
    };

    const palette = industryPalettes[industry] || industryPalettes.default;

    return {
      colorPalette: {
        ...palette,
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(240, 10%, 4%)',
        muted: 'hsl(240, 5%, 95%)',
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        sizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      },
      animations: [
        'fadeIn 0.5s ease-out',
        'slideUp 0.3s ease-out',
        'pulse 2s infinite'
      ],
      gradients: [
        `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
        `linear-gradient(45deg, ${palette.secondary}, ${palette.primary})`
      ],
      shadows: [
        '0 1px 3px rgba(0,0,0,0.12)',
        '0 4px 12px rgba(0,0,0,0.15)',
        '0 8px 32px rgba(0,0,0,0.1)'
      ]
    };
  }

  /**
   * Applique le design généré au CSS
   */
  static applyDesignToCSS(design: AIGeneratedDesign, originalCSS: string): string {
    let enhancedCSS = originalCSS;

    // Ajouter les variables CSS personnalisées
    const customVariables = `
:root {
  /* AI Generated Color Palette */
  --ai-primary: ${design.colorPalette.primary};
  --ai-secondary: ${design.colorPalette.secondary};
  --ai-accent: ${design.colorPalette.accent};
  --ai-background: ${design.colorPalette.background};
  --ai-foreground: ${design.colorPalette.foreground};
  --ai-muted: ${design.colorPalette.muted};
  
  /* AI Generated Typography */
  --ai-heading-font: '${design.typography.headingFont}', sans-serif;
  --ai-body-font: '${design.typography.bodyFont}', sans-serif;
  
  /* AI Generated Spacing */
  --ai-spacing-xs: ${design.spacing.xs};
  --ai-spacing-sm: ${design.spacing.sm};
  --ai-spacing-md: ${design.spacing.md};
  --ai-spacing-lg: ${design.spacing.lg};
  --ai-spacing-xl: ${design.spacing.xl};
  
  /* AI Generated Gradients */
  --ai-gradient-1: ${design.gradients[0]};
  --ai-gradient-2: ${design.gradients[1] || design.gradients[0]};
  
  /* AI Generated Shadows */
  --ai-shadow-sm: ${design.shadows[0]};
  --ai-shadow-md: ${design.shadows[1] || design.shadows[0]};
  --ai-shadow-lg: ${design.shadows[2] || design.shadows[1] || design.shadows[0]};
}

/* AI Generated Animations */
${design.animations.map((animation, i) => 
  `@keyframes ai-animation-${i + 1} { 
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }`
).join('\n')}

/* Apply AI design to common elements */
body {
  font-family: var(--ai-body-font);
  color: var(--ai-foreground);
  background: var(--ai-background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--ai-heading-font);
  color: var(--ai-primary);
}

.btn-primary {
  background: var(--ai-gradient-1);
  color: white;
  border: none;
  box-shadow: var(--ai-shadow-md);
}

.card {
  background: var(--ai-background);
  border: 1px solid var(--ai-muted);
  box-shadow: var(--ai-shadow-sm);
}

.hero-section {
  background: var(--ai-gradient-2);
}
    `;

    // Injecter les variables au début du CSS
    enhancedCSS = customVariables + '\n' + enhancedCSS;

    return enhancedCSS;
  }
}