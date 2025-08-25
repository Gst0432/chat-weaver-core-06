import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Wand2, BookOpen, Sparkles, Image } from 'lucide-react';
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

const languages = [
  { value: 'fr', label: 'Français', description: 'Langue française' },
  { value: 'en', label: 'English', description: 'English language' },
  { value: 'es', label: 'Español', description: 'Idioma español' },
  { value: 'de', label: 'Deutsch', description: 'Deutsche Sprache' },
  { value: 'it', label: 'Italiano', description: 'Lingua italiana' },
  { value: 'pt', label: 'Português', description: 'Língua portuguesa' },
  { value: 'ar', label: 'العربية', description: 'اللغة العربية' },
  { value: 'zh', label: '中文', description: '中文语言' }
];

const models = [
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Recommandé)', description: 'Créatif et détaillé' },
  { value: 'gpt-5-2025-08-07', label: 'GPT-5', description: 'Plus avancé et nuancé' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Excellent pour la rédaction' }
];

export function EbookGenerator({ onEbookGenerated }: EbookGeneratorProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState('business');
  const [language, setLanguage] = useState('fr');
  const [useAI, setUseAI] = useState(true);
  const [model, setModel] = useState('gpt-4.1-2025-04-14');
  const [generating, setGenerating] = useState(false);
  
  const [includeCover, setIncludeCover] = useState(true);
  const [includeAbout, setIncludeAbout] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  
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
    let generatedEbook = null;

    try {
      toast({
        title: "Génération en cours",
        description: "Création de votre ebook complet...",
      });

      const { data, error } = await supabase.functions.invoke('generate-ebook', {
        body: {
          title: title.trim(),
          author: author.trim(),
          prompt: prompt.trim(),
          language,
          useAI,
          model,
          template,
          format: 'markdown',
          includeCover,
          includeAbout,
          includeToc
        }
      });

      if (error) throw error;

      toast({
        title: "Succès !",
        description: "Ebook généré avec succès !",
      });

      // Reset form
      setTitle('');
      setAuthor('');
      setPrompt('');
      
      
      onEbookGenerated();
    } catch (error) {
      console.error('Error generating ebook:', error);
      toast({
        title: "Erreur",
        description: `Impossible de générer l'ebook: ${error.message}`,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <Label htmlFor="language">Langue</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <div className="flex items-center gap-2">
                      <span>{lang.label}</span>
                      <span className="text-xs text-muted-foreground">({lang.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="space-y-4">
              <div>
                <Label>Modèle IA</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Pages supplémentaires</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeCover"
                      checked={includeCover}
                      onCheckedChange={setIncludeCover}
                    />
                    <Label htmlFor="includeCover">Page de couverture</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeAbout"
                      checked={includeAbout}
                      onCheckedChange={setIncludeAbout}
                    />
                    <Label htmlFor="includeAbout">Page "À propos"</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeToc"
                      checked={includeToc}
                      onCheckedChange={setIncludeToc}
                    />
                    <Label htmlFor="includeToc">Table des matières</Label>
                  </div>
                </div>
              </div>
              
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
          <div className="text-center text-sm text-muted-foreground space-y-3">
            <p className="font-medium text-primary">📚 Génération de l'ebook en cours</p>
            <p>⏳ La génération peut prendre 60-120 secondes...</p>
            <p>Un ebook complet de 15 000+ mots avec 15-20 chapitres détaillés est en cours de création.</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse w-2/3"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}