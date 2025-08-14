import { supabase } from "@/integrations/supabase/client";
import type { AppGenerationOptions, GeneratedApp } from "./appGeneratorService";

export interface UserPreferences {
  id?: string;
  user_id: string;
  favorite_industries: string[];
  favorite_styles: string[];
  favorite_colors: string[];
  default_technical_features: any;
  generation_history: any[];
  template_preferences: any;
}

export interface SaaSTemplate {
  id?: string;
  user_id: string;
  template_name: string;
  template_type: string;
  industry: string;
  template_content: any;
  is_public: boolean;
  usage_count: number;
}

export class ContextualMemoryService {

  /**
   * Récupère les préférences utilisateur
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur récupération préférences:', error);
      return null;
    }

    return data as UserPreferences;
  }

  /**
   * Sauvegarde ou met à jour les préférences utilisateur
   */
  static async saveUserPreferences(preferences: Partial<UserPreferences>): Promise<boolean> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(preferences as any, { onConflict: 'user_id' });

    if (error) {
      console.error('Erreur sauvegarde préférences:', error);
      return false;
    }

    return true;
  }

  /**
   * Met à jour l'historique de génération
   */
  static async updateGenerationHistory(
    userId: string,
    prompt: string,
    options: AppGenerationOptions,
    success: boolean
  ): Promise<void> {
    const preferences = await this.getUserPreferences(userId);
    const currentHistory = preferences?.generation_history || [];

    // Garder seulement les 50 dernières générations
    const newHistory = [
      {
        timestamp: new Date().toISOString(),
        prompt,
        options,
        success
      },
      ...currentHistory
    ].slice(0, 50);

    await this.saveUserPreferences({
      user_id: userId,
      generation_history: newHistory
    });
  }

  /**
   * Sauvegarde une app générée
   */
  static async saveGeneratedApp(
    userId: string,
    appName: string,
    appType: string,
    industry: string,
    content: GeneratedApp,
    options: AppGenerationOptions
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('generated_apps')
      .insert({
        user_id: userId,
        app_name: appName,
        app_type: appType,
        industry,
        generated_content: content as any,
        generation_options: options as any
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erreur sauvegarde app:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Récupère les apps générées par l'utilisateur
   */
  static async getUserGeneratedApps(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('generated_apps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération apps:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Suggère des options basées sur l'historique utilisateur
   */
  static async getSuggestedOptions(userId: string): Promise<Partial<AppGenerationOptions>> {
    const preferences = await this.getUserPreferences(userId);
    
    if (!preferences || !preferences.generation_history.length) {
      return {};
    }

    const history = preferences.generation_history;
    
    // Analyser l'historique pour suggérer des options
    const industryFrequency: Record<string, number> = {};
    const styleFrequency: Record<string, number> = {};
    const colorFrequency: Record<string, number> = {};

    history.forEach(entry => {
      if (entry.success && entry.options) {
        industryFrequency[entry.options.industry] = (industryFrequency[entry.options.industry] || 0) + 1;
        if (entry.options.style) {
          styleFrequency[entry.options.style] = (styleFrequency[entry.options.style] || 0) + 1;
        }
        if (entry.options.colorScheme) {
          colorFrequency[entry.options.colorScheme] = (colorFrequency[entry.options.colorScheme] || 0) + 1;
        }
      }
    });

    const getMostFrequent = (frequency: Record<string, number>) => {
      return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b, '');
    };

    return {
      industry: getMostFrequent(industryFrequency) || 'technologie',
      style: getMostFrequent(styleFrequency) as any || 'modern',
      colorScheme: getMostFrequent(colorFrequency) as any || 'ai-generated',
      ...preferences.default_technical_features
    };
  }

  /**
   * Crée un template à partir d'une app générée
   */
  static async createTemplate(
    userId: string,
    templateName: string,
    templateType: string,
    industry: string,
    content: GeneratedApp,
    isPublic: boolean = false
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('saas_templates')
      .insert({
        user_id: userId,
        template_name: templateName,
        template_type: templateType,
        industry,
        template_content: content as any,
        is_public: isPublic
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erreur création template:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Récupère les templates disponibles
   */
  static async getTemplates(userId: string, industry?: string): Promise<SaaSTemplate[]> {
    let query = supabase
      .from('saas_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`);

    if (industry) {
      query = query.eq('industry', industry);
    }

    const { data, error } = await query.order('usage_count', { ascending: false });

    if (error) {
      console.error('Erreur récupération templates:', error);
      return [];
    }

    return (data || []) as SaaSTemplate[];
  }

  /**
   * Met à jour les préférences basées sur le comportement utilisateur
   */
  static async updatePreferencesFromUsage(
    userId: string,
    options: AppGenerationOptions,
    wasSuccessful: boolean
  ): Promise<void> {
    if (!wasSuccessful) return;

    const preferences = await this.getUserPreferences(userId) || {
      user_id: userId,
      favorite_industries: [],
      favorite_styles: [],
      favorite_colors: [],
      default_technical_features: {},
      generation_history: [],
      template_preferences: {}
    };

    // Mettre à jour les favoris
    if (!preferences.favorite_industries.includes(options.industry)) {
      preferences.favorite_industries = [...preferences.favorite_industries, options.industry].slice(-5);
    }

    if (options.style && !preferences.favorite_styles.includes(options.style)) {
      preferences.favorite_styles = [...preferences.favorite_styles, options.style].slice(-5);
    }

    if (options.colorScheme && !preferences.favorite_colors.includes(options.colorScheme)) {
      preferences.favorite_colors = [...preferences.favorite_colors, options.colorScheme].slice(-5);
    }

    // Mettre à jour les fonctionnalités techniques par défaut
    preferences.default_technical_features = {
      includeAuth: options.includeAuth,
      includeDatabase: options.includeDatabase,
      includeStripe: options.includeStripe,
      includeAnalytics: options.includeAnalytics,
      includeStorage: options.includeStorage,
      includeRealtime: options.includeRealtime,
      includeNotifications: options.includeNotifications,
      ...preferences.default_technical_features
    };

    await this.saveUserPreferences(preferences);
  }
}