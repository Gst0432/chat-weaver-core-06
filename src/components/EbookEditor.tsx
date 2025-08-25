import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, FileText, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Ebook {
  id: string;
  title: string;
  author: string;
  content_markdown: string;
  created_at: string;
}

interface EbookEditorProps {
  ebook: Ebook | null;
  onSave: () => void;
  onCancel: () => void;
}

export function EbookEditor({ ebook, onSave, onCancel }: EbookEditorProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [extending, setExtending] = useState(false);
  const { toast } = useToast();

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const isMinimumLength = wordCount >= 15000;

  useEffect(() => {
    if (ebook) {
      setTitle(ebook.title);
      setAuthor(ebook.author);
      setContent(ebook.content_markdown);
    } else {
      setTitle('');
      setAuthor('');
      setContent('# Nouveau Ebook\n\n## Introduction\n\nVotre contenu ici...');
    }
  }, [ebook]);

  const handleSave = async () => {
    if (!title.trim() || !author.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre et l'auteur sont requis",
        variant: "destructive",
      });
      return;
    }

    if (wordCount < 15000) {
      toast({
        title: "Contenu insuffisant",
        description: `Votre ebook contient ${wordCount} mots. Le minimum requis est de 15 000 mots.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (ebook) {
        // Update existing ebook
        const { error } = await supabase
          .from('ebooks' as any)
          .update({
            title: title.trim(),
            author: author.trim(),
            content_markdown: content
          })
          .eq('id', ebook.id);

        if (error) throw error;
      } else {
        // Create new ebook
        const { error } = await supabase
          .from('ebooks' as any)
          .insert({
            title: title.trim(),
            author: author.trim(),
            content_markdown: content
          });

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: ebook ? "Ebook mis à jour" : "Ebook créé avec succès",
      });

      onSave();
    } catch (error) {
      console.error('Error saving ebook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'ebook",
        variant: "destructive",
      });
    }
  };

  const extendContent = async () => {
    if (!content.trim()) {
      toast({
        title: "Erreur",
        description: "Aucun contenu à étendre",
        variant: "destructive",
      });
      return;
    }

    setExtending(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Tu es un écrivain professionnel qui développe et enrichit le contenu existant pour atteindre au moins 15,000 mots.'
            },
            {
              role: 'user',
              content: `Le contenu suivant de l'ebook "${title}" contient actuellement ${wordCount} mots. Je dois l'étendre pour atteindre au moins 15,000 mots. 

Développe chaque section existante avec :
- Plus de détails et d'explications
- Des exemples concrets et des études de cas
- Des sous-sections supplémentaires
- Du contenu pratique et actionnable
- Des anecdotes et des témoignages
- Des conseils d'experts

Contenu actuel :
${content}

Fournis la version étendue et enrichie :`
            }
          ],
          model: 'gpt-4.1-2025-04-14'
        }
      });

      if (error) throw error;

      const extendedContent = data.choices[0].message.content;
      setContent(extendedContent);
      
      const newWordCount = extendedContent.split(/\s+/).filter(word => word.length > 0).length;
      toast({
        title: "Contenu étendu !",
        description: `Contenu étendu de ${wordCount} à ${newWordCount} mots`,
      });
    } catch (error) {
      console.error('Error extending content:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'étendre le contenu",
        variant: "destructive",
      });
    } finally {
      setExtending(false);
    }
  };

  const renderPreview = (markdown: string) => {
    return markdown
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold text-primary mb-4">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-semibold text-primary mb-3 mt-6">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-medium text-primary mb-2 mt-4">{line.slice(4)}</h3>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        
        // Handle bold and italic
        let processedLine = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        return (
          <p key={i} className="mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine }} />
        );
      });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {ebook ? 'Éditer l\'ebook' : 'Nouvel ebook'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full pb-6">
        <div className="space-y-4 h-full flex flex-col">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Titre</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l'ebook"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Auteur</label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nom de l'auteur"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Nombre de mots:</span>
                <Badge variant={isMinimumLength ? "default" : "destructive"}>
                  {wordCount.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Minimum: 15 000 mots
                  {!isMinimumLength && (
                    <span className="text-destructive ml-2">
                      ({(15000 - wordCount).toLocaleString()} mots manquants)
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={extendContent}
                  disabled={extending || !content.trim()}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  {extending ? 'Extension...' : 'Étendre avec IA'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Tabs defaultValue="edit" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Édition</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="w-4 h-4 mr-1" />
                  Aperçu
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="flex-1 mt-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Contenu de l'ebook en Markdown..."
                  className="h-full min-h-[400px] font-mono text-sm resize-none"
                />
              </TabsContent>
              
              <TabsContent value="preview" className="flex-1 mt-4">
                <div className="h-full border rounded-md p-4 overflow-y-auto bg-card">
                  <div className="max-w-none prose prose-sm">
                    {renderPreview(content)}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}