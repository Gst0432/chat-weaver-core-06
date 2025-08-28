import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { renderMarkdown } from '@/lib/markdown';

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
  const { toast } = useToast();

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const isMinimumLength = wordCount >= 20000;

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

    if (wordCount < 20000) {
      toast({
        title: "Contenu insuffisant",
        description: `Votre ebook contient ${wordCount} mots. Le minimum requis est de 20 000 mots.`,
        variant: "destructive",
      });
      return;
    }

    if (wordCount > 25000) {
      toast({
        title: "Contenu trop long",
        description: `Votre ebook contient ${wordCount} mots. Le maximum recommandé est de 25 000 mots.`,
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
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (markdown: string) => {
    return (
      <div 
        className="prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} 
      />
    );
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
              <div className="text-sm text-muted-foreground">
                Fourchette: 20 000 - 25 000 mots
                {wordCount < 20000 && (
                  <span className="text-destructive ml-2">
                    ({(20000 - wordCount).toLocaleString()} mots manquants)
                  </span>
                )}
                {wordCount > 25000 && (
                  <span className="text-destructive ml-2">
                    ({(wordCount - 25000).toLocaleString()} mots en trop)
                  </span>
                )}
                {wordCount >= 20000 && wordCount <= 25000 && (
                  <span className="text-green-600 ml-2">✓ Optimal</span>
                )}
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