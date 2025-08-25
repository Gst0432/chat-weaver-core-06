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
  { value: 'business', label: 'Guide Business', description: 'Guide pratique pour entrepreneurs' },
  { value: 'tech', label: 'Manuel Technique', description: 'Documentation technique détaillée' },
  { value: 'education', label: 'Livre Éducatif', description: 'Contenu pédagogique structuré' },
  { value: 'fiction', label: 'Roman Fiction', description: 'Histoire créative et narrative' },
  { value: 'howto', label: 'Tutoriel Pratique', description: 'Guide étape par étape' },
  { value: 'self-help', label: 'Développement Personnel', description: 'Conseils et méthodes de croissance' }
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
  const [useAI, setUseAI] = useState(true);
  const [model, setModel] = useState('gpt-4.1-2025-04-14');
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
      const { data, error } = await supabase.functions.invoke('generate-ebook', {
        body: {
          title: title.trim(),
          author: author.trim(),
          prompt: prompt.trim(),
          useAI,
          model,
          template,
          format: 'markdown'
        }
      });

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
    } catch (error) {
      console.error('Error generating ebook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'ebook. Vérifiez votre connexion.",
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
          <div className="text-center text-sm text-muted-foreground">
            <p>⏳ La génération peut prendre 30-60 secondes...</p>
            <p>Un ebook complet avec plusieurs chapitres est en cours de création.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}