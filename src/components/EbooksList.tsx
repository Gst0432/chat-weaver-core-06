import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Trash2, Download, Edit, FileText, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentGeneratorService } from '@/services/documentGeneratorService';

interface Ebook {
  id: string;
  title: string;
  author: string;
  content_markdown: string;
  created_at: string;
}

interface EbooksListProps {
  onEdit: (ebook: Ebook) => void;
  onRefresh: number;
}

export function EbooksList({ onEdit, onRefresh }: EbooksListProps) {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadEbooks = async () => {
    try {
      const { data, error } = await supabase
        .from('ebooks' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEbooks((data as unknown as Ebook[]) || []);
    } catch (error) {
      console.error('Error loading ebooks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les ebooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEbooks();
  }, [onRefresh]);

  const deleteEbook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ebooks' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEbooks(prev => prev.filter(e => e.id !== id));
      toast({
        title: "Succès",
        description: "Ebook supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting ebook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'ebook",
        variant: "destructive",
      });
    }
  };

  const downloadEbook = (ebook: Ebook, format: 'md' | 'html') => {
    let content = ebook.content_markdown;
    let mimeType = 'text/markdown';
    let extension = 'md';

    if (format === 'html') {
      content = convertToHTML(ebook.content_markdown, ebook.title, ebook.author);
      mimeType = 'text/html';
      extension = 'html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ebook.title.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const exportToWord = async (ebook: Ebook, pageSize: 'A4' | 'A5' = 'A4') => {
    try {
      const dataUri = await DocumentGeneratorService.generateDocument({
        content: ebook.content_markdown,
        type: 'docx'
      });
      
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `${ebook.title.replace(/[^a-z0-9]/gi, '_')}_${pageSize}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Succès",
        description: `Document Word ${pageSize} généré avec succès`,
      });
    } catch (error) {
      console.error('Error exporting to Word:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter en Word",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async (ebook: Ebook, pageSize: 'A4' | 'A5' = 'A4') => {
    try {
      const dataUri = await DocumentGeneratorService.generateDocument({
        content: ebook.content_markdown,
        type: 'pdf'
      });
      
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `${ebook.title.replace(/[^a-z0-9]/gi, '_')}_${pageSize}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Succès",
        description: `PDF ${pageSize} généré avec succès`,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter en PDF",
        variant: "destructive",
      });
    }
  };

  const convertToHTML = (markdown: string, title: string, author: string): string => {
    let html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|l])/gm, '<p>')
      .replace(/$/gm, '</p>');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; }
        h1 { color: #2563eb; border-bottom: 3px solid #e5e7eb; padding-bottom: 1rem; }
        h2 { color: #1e40af; margin-top: 2rem; }
        h3 { color: #3730a3; }
        p { margin-bottom: 1rem; text-align: justify; }
        .author { text-align: center; font-style: italic; color: #6b7280; margin-bottom: 3rem; }
    </style>
</head>
<body>
    <div class="author">Par ${author}</div>
    ${html}
</body>
</html>`;
  };

  const filteredEbooks = ebooks.filter(ebook => 
    ebook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ebook.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher par titre ou auteur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredEbooks.length} ebook{filteredEbooks.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {filteredEbooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun ebook trouvé</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "Aucun résultat pour votre recherche" : "Créez votre premier ebook pour commencer"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEbooks.map((ebook) => (
            <Card key={ebook.id} className="group hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg line-clamp-2">{ebook.title}</CardTitle>
                <p className="text-sm text-muted-foreground">Par {ebook.author}</p>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {new Date(ebook.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {ebook.content_markdown.split(/\s+/).length} mots
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(ebook)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Éditer
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteEbook(ebook.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportToPDF(ebook, 'A4')}
                        className="text-xs"
                      >
                        <FileImage className="w-3 h-3 mr-1" />
                        PDF A4
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportToPDF(ebook, 'A5')}
                        className="text-xs"
                      >
                        <FileImage className="w-3 h-3 mr-1" />
                        PDF A5
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportToWord(ebook, 'A4')}
                        className="text-xs"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Word A4
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportToWord(ebook, 'A5')}
                        className="text-xs"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Word A5
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadEbook(ebook, 'md')}
                      className="text-xs"
                    >
                      Markdown
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadEbook(ebook, 'html')}
                      className="text-xs"
                    >
                      HTML
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}