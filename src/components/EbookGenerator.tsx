import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Wand2, BookOpen, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EbookGeneratorProps {
  onEbookGenerated: () => void;
}

const templates = [
  { value: 'business', label: 'Guide Business Complet', description: 'Guide détaillé avec stratégies, études de cas et plans d\'action (15-20 chapitres)' },
  { value: 'tech', label: 'Manuel Technique Approfondi', description: 'Documentation complète avec tutoriels, exemples et bonnes pratiques (18-25 chapitres)' },
  { value: 'education', label: 'Livre Éducatif Compréhensif', description: 'Contenu pédagogique avec exercices, cas pratiques et évaluations (16-22 chapitres)' },
  { value: 'fiction', label: 'Roman Fiction Long Format', description: 'Histoire développée avec personnages complexes et intrigue détaillée (20-30 chapitres)' },
  { value: 'howto', label: 'Guide Pratique Détaillé', description: 'Tutoriel complet avec méthodologie, outils et dépannage (15-20 étapes)' },
  { value: 'self-help', label: 'Développement Personnel Intégral', description: 'Méthodes complètes avec exercices, réflexions et plan d\'action (18-25 modules)' },
  { value: 'academic', label: 'Ouvrage Académique', description: 'Recherche approfondie avec références, analyses et conclusions (20-25 chapitres)' },
  { value: 'cookbook', label: 'Livre de Cuisine Complet', description: 'Recettes détaillées avec techniques, variantes et conseils de chef (100+ recettes)' }
];

const models = [
  // GPT-5 Series (OpenAI direct)
  { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Flagship)', description: 'Le plus avancé, créatif et nuancé', category: 'OpenAI Premium' },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (Recommandé)', description: 'Rapide, efficace et économique', category: 'OpenAI Premium' },
  { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano (Ultra-rapide)', description: 'Le plus rapide et économique', category: 'OpenAI Premium' },
  
  // Reasoning Models (OpenAI direct)
  { value: 'o3-2025-04-16', label: 'O3 (Raisonnement)', description: 'Analyse complexe et logique avancée', category: 'OpenAI Reasoning' },
  { value: 'o4-mini-2025-04-16', label: 'O4 Mini (Raisonnement rapide)', description: 'Raisonnement optimisé et efficace', category: 'OpenAI Reasoning' },
  
  // Legacy OpenAI
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', description: 'Fiable et éprouvé', category: 'OpenAI Legacy' },
  
  // Meta Llama (OpenRouter)
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', description: 'Open source puissant et polyvalent', category: 'Meta Open Source' },
  { value: 'meta-llama/llama-3.2-90b-vision-instruct', label: 'Llama 3.2 90B Vision', description: 'Vision et multimodal avancé', category: 'Meta Open Source' },
  
  // xAI Grok (OpenRouter)
  { value: 'x-ai/grok-beta', label: 'Grok Beta', description: 'IA conversationnelle d\'Elon Musk', category: 'xAI' },
  { value: 'x-ai/grok-vision-beta', label: 'Grok Vision', description: 'Grok avec capacités visuelles', category: 'xAI' },
  
  // DeepSeek (OpenRouter)
  { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', description: 'Modèle de raisonnement avancé', category: 'DeepSeek' },
  { value: 'deepseek/deepseek-v3', label: 'DeepSeek V3', description: 'Dernière génération polyvalente', category: 'DeepSeek' },
  { value: 'deepseek/deepseek-v3.1', label: 'DeepSeek V3.1', description: 'Version améliorée et optimisée', category: 'DeepSeek' },
  
  // Google Gemini (OpenRouter)
  { value: 'google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', description: 'Google DeepMind dernière génération', category: 'Google' },
  { value: 'google/gemini-exp-1206', label: 'Gemini Experimental', description: 'Modèle expérimental avancé', category: 'Google' },
  
  // Claude (OpenRouter)
  { value: 'anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Excellent pour la rédaction', category: 'Anthropic' },
  { value: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: 'Rapide et efficace', category: 'Anthropic' }
];

export function EbookGenerator({ onEbookGenerated }: EbookGeneratorProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState('business');
  const [useAI, setUseAI] = useState(true);
  const [model, setModel] = useState('gpt-5-mini-2025-08-07');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!title.trim() || !author.trim() || !prompt.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      console.log('🚀 Starting ebook generation...', { model, template });
      
      const { data, error } = await Promise.race([
        supabase.functions.invoke('generate-ebook', {
          body: {
            title: title.trim(),
            author: author.trim(),
            prompt: prompt.trim(),
            useAI,
            model,
            template,
            format: 'markdown'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de génération (120s)')), 120000)
        )
      ]) as any;

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ebook généré avec succès !",
      });

      // Reset form
      setTitle('');
      setAuthor('');
      setPrompt('');
      
      onEbookGenerated();
    } catch (error: any) {
      console.error('❌ Error generating ebook:', error);
      
      let errorMessage = "Impossible de générer l'ebook.";
      
      if (error.message?.includes('Timeout')) {
        errorMessage = "Génération trop longue. Essayez avec un prompt plus court ou un modèle plus rapide.";
      } else if (error.message?.includes('Clé API invalide')) {
        errorMessage = "Clé API invalide. Contactez l'administrateur.";
      } else if (error.message?.includes('Limite')) {
        errorMessage = "Limite atteinte. Essayez dans quelques minutes.";
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Erreur de connexion. Vérifiez votre réseau et réessayez.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedTemplate = templates.find(t => t.value === template);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          Générateur d'Ebook IA
        </CardTitle>
        <p className="text-muted-foreground">
          Créez un ebook complet automatiquement avec l'intelligence artificielle
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Titre de l'ebook *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Guide Complet du Marketing Digital"
            />
          </div>
          <div>
            <Label htmlFor="author">Auteur *</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Votre nom"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="template">Type d'ebook</Label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col">
                    <span>{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="prompt">Sujet et consignes *</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez le sujet de votre ebook et les points clés à aborder..."
            className="min-h-[120px]"
          />
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <Label htmlFor="useAI">Génération automatique avec IA</Label>
            </div>
            <Switch
              id="useAI"
              checked={useAI}
              onCheckedChange={setUseAI}
            />
          </div>

          {useAI && (
            <div>
              <Label>Modèle IA</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Object.entries(
                    models.reduce((acc, m) => {
                      const category = m.category || 'Autres';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(m);
                      return acc;
                    }, {} as Record<string, typeof models>)
                  ).map(([category, categoryModels]) => (
                    <div key={category}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {category}
                      </div>
                      {categoryModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-primary hover:shadow-glow"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Génération en cours...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4 mr-2" />
                Générer l'Ebook
              </>
            )}
          </Button>
        </div>

        {generating && (
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>⏳ Génération en cours (30-90 secondes)...</p>
            <p>Création d'un ebook professionnel de 5 000-8 000 mots avec 8-12 chapitres.</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}