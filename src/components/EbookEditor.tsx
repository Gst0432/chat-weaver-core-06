import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, FileText, Wand2, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageService } from '@/services/imageService';

interface Ebook {
  id: string;
  title: string;
  author: string;
  content_markdown: string;
  created_at: string;
  cover_image_url?: string;
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
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverPrompt, setCoverPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [extending, setExtending] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const { toast } = useToast();

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const isMinimumLength = wordCount >= 15000;

  useEffect(() => {
    if (ebook) {
      setTitle(ebook.title);
      setAuthor(ebook.author);
      setContent(ebook.content_markdown);
      setCoverImageUrl(ebook.cover_image_url || '');
      setCoverPrompt('');
    } else {
      setTitle('');
      setAuthor('');
      setContent('# Nouveau Ebook\n\n## Introduction\n\nVotre contenu ici...');
      setCoverImageUrl('');
      setCoverPrompt('');
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

    // Allow saving as draft even under 15,000 words
    const isDraft = wordCount < 15000;

    setSaving(true);
    try {
      if (ebook) {
        // Update existing ebook
        const { error } = await supabase
          .from('ebooks' as any)
          .update({
            title: title.trim(),
            author: author.trim(),
            content_markdown: content,
            cover_image_url: coverImageUrl || null
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
            content_markdown: content,
            cover_image_url: coverImageUrl || null
          });

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: isDraft 
          ? `${ebook ? "Brouillon mis à jour" : "Brouillon sauvegardé"} (${wordCount.toLocaleString()} mots)`
          : `${ebook ? "Ebook mis à jour" : "Ebook créé"} (${wordCount.toLocaleString()} mots)`,
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
          model: 'gpt-4.1-2025-04-14',
          max_completion_tokens: 16000
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

  const generateCoverImage = async () => {
    if (!coverPrompt.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un prompt pour générer l'image de couverture",
        variant: "destructive",
      });
      return;
    }

    setGeneratingImage(true);
    try {
      console.log('🎨 Generating cover image with prompt:', coverPrompt);
      
      const imageUrl = await ImageService.generateImage({
        prompt: `Book cover illustration: ${coverPrompt}. Professional book cover design, high quality, vertical format`,
        size: '1024x1792',
        quality: 'hd',
        provider: 'dalle'
      });

      // Check if imageUrl is a base64 data URL or external URL
      if (imageUrl.startsWith('data:')) {
        // Direct base64 image - use it directly
        setCoverImageUrl(imageUrl);
      } else {
        // External URL - fetch and upload to Supabase Storage
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const filename = `cover-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filename, blob, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filename);

        setCoverImageUrl(publicUrl);
      }
      
      toast({
        title: "Image générée !",
        description: "L'image de couverture a été générée avec succès",
      });
    } catch (error) {
      console.error('Error generating cover image:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'image de couverture",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
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

            {/* Cover Image Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                <h3 className="font-medium">Image de Couverture</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Prompt pour l'image</label>
                    <Textarea
                      value={coverPrompt}
                      onChange={(e) => setCoverPrompt(e.target.value)}
                      placeholder="ex: Couverture élégante avec un thème technologique, couleurs bleues et dorées, design moderne"
                      className="h-20 resize-none"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={generateCoverImage}
                    disabled={generatingImage || !coverPrompt.trim()}
                    className="w-full"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Générer Image
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {coverImageUrl ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium block">Aperçu</label>
                      <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted/20">
                        <img 
                          src={coverImageUrl} 
                          alt="Cover preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        size="sm" 
                        variant="outline"
                        onClick={() => setCoverImageUrl('')}
                        className="w-full"
                      >
                        Supprimer l'image
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-48 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center bg-muted/10">
                      <div className="text-center text-muted-foreground">
                        <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aucune image générée</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Nombre de mots:</span>
                <Badge variant={isMinimumLength ? "default" : "secondary"}>
                  {wordCount.toLocaleString()}
                </Badge>
                {!isMinimumLength && (
                  <Badge variant="outline" className="text-xs">
                    Brouillon
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Minimum pour export: 15 000 mots
                  {!isMinimumLength && (
                    <span className="text-muted-foreground ml-2">
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
                  {extending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Extension...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-1" />
                      Étendre avec IA
                    </>
                  )}
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