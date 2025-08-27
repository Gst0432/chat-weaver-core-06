import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, FileX, FilePlus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentGeneratorService } from '@/services/documentGeneratorService';
import { supabase } from '@/integrations/supabase/client';

interface DocumentGeneration {
  id: string;
  title: string;
  content: string;
  type: 'pdf' | 'docx' | 'pptx' | 'markdown' | 'html' | 'xlsx';
  template?: 'report' | 'presentation' | 'letter' | 'resume' | 'contract';
  created_at: string;
  file_url?: string;
  status: 'pending' | 'completed' | 'failed';
}

export default function Documents() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState<'pdf' | 'docx' | 'pptx' | 'markdown' | 'html' | 'xlsx'>('pdf');
  const [template, setTemplate] = useState<'report' | 'presentation' | 'letter' | 'resume' | 'contract'>('report');
  const [aiEnhance, setAiEnhance] = useState(true);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Simulate loading from local storage for now
      const savedDocs = localStorage.getItem('document_generations');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDocuments = (docs: DocumentGeneration[]) => {
    localStorage.setItem('document_generations', JSON.stringify(docs));
  };

  const generateDocument = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le titre et le contenu",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const newDocument: DocumentGeneration = {
        id: crypto.randomUUID(),
        title,
        content,
        type: documentType,
        template,
        created_at: new Date().toISOString(),
        status: 'pending'
      };

      // Add to list immediately
      const updatedDocs = [newDocument, ...documents];
      setDocuments(updatedDocs);
      saveDocuments(updatedDocs);

      // Generate document
      const dataUri = await DocumentGeneratorService.generateDocument({
        content,
        type: documentType,
        template: template,
        enhanceWithAI: aiEnhance
      });

      // Update with completed status
      const completedDoc = { ...newDocument, status: 'completed' as const, file_url: dataUri };
      const finalDocs = updatedDocs.map(doc => doc.id === newDocument.id ? completedDoc : doc);
      setDocuments(finalDocs);
      saveDocuments(finalDocs);

      // Clear form
      setTitle('');
      setContent('');
      setTemplate('report');

      toast({
        title: "Succès",
        description: "Document généré avec succès",
      });

    } catch (error) {
      console.error('Error generating document:', error);
      
      // Update status to failed
      const failedDocs = documents.map(doc => 
        doc.id === documents[0]?.id ? { ...doc, status: 'failed' as const } : doc
      );
      setDocuments(failedDocs);
      saveDocuments(failedDocs);

      toast({
        title: "Erreur",
        description: "Impossible de générer le document",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocument = (doc: DocumentGeneration) => {
    if (!doc.file_url) return;
    
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = `${doc.title}.${doc.type}`;
    link.click();
  };

  const deleteDocument = (id: string) => {
    const updatedDocs = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
    
    toast({
      title: "Document supprimé",
      description: "Le document a été supprimé avec succès",
    });
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: DocumentGeneration['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Terminé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En cours</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="w-4 h-4" />;
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Traitement de Documents</h1>
            <p className="text-muted-foreground">Générez et gérez vos documents automatiquement</p>
          </div>
        </div>

        {/* Document Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus className="w-5 h-5" />
              Générateur de Documents
            </CardTitle>
            <CardDescription>
              Créez des documents professionnels avec l'aide de l'IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Titre du document</label>
                <Input
                  placeholder="Entrez le titre..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type de document</label>
                <Select value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">Word (DOCX)</SelectItem>
                    <SelectItem value="pptx">PowerPoint (PPTX)</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Contenu</label>
              <Textarea
                placeholder="Entrez le contenu du document..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Template</label>
              <Select value={template} onValueChange={(value: any) => setTemplate(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">Rapport</SelectItem>
                  <SelectItem value="presentation">Présentation</SelectItem>
                  <SelectItem value="letter">Lettre</SelectItem>
                  <SelectItem value="resume">CV</SelectItem>
                  <SelectItem value="contract">Contrat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={generateDocument} 
              disabled={generating}
              className="w-full"
            >
              {generating ? 'Génération en cours...' : 'Générer le Document'}
            </Button>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents Générés</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun document trouvé</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(doc.type)}
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {doc.content.substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.status === 'completed' && doc.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadDocument(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}