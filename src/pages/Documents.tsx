import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Trash2, FileX, FilePlus, Search, Upload, MessageSquare, RefreshCw, Globe, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentGeneratorService } from '@/services/documentGeneratorService';
import { supabase } from '@/integrations/supabase/client';
import DocumentPreview from '@/components/DocumentPreview';
import DocumentChat from '@/components/DocumentChat';

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

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  file_url?: string;
  created_at: string;
  analysis?: string;
  translations?: { [lang: string]: string };
}

export default function Documents() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentGeneration[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState<'pdf' | 'docx' | 'pptx' | 'markdown' | 'html' | 'xlsx'>('pdf');
  const [template, setTemplate] = useState<'report' | 'presentation' | 'letter' | 'resume' | 'contract'>('report');
  const [aiEnhance, setAiEnhance] = useState(true);
  
  // Upload & Analysis state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationResult, setTranslationResult] = useState('');

  // Navigation state for preview and chat
  const [currentView, setCurrentView] = useState<'main' | 'preview' | 'chat'>('main');
  const [selectedUploadedFile, setSelectedUploadedFile] = useState<UploadedFile | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load generated documents
      const savedDocs = localStorage.getItem('document_generations');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
      
      // Load uploaded files
      const savedFiles = localStorage.getItem('uploaded_files');
      if (savedFiles) {
        setUploadedFiles(JSON.parse(savedFiles));
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

  const saveUploadedFiles = (files: UploadedFile[]) => {
    localStorage.setItem('uploaded_files', JSON.stringify(files));
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

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('word') && !file.type.includes('document')) {
      toast({
        title: "Erreur",
        description: "Seuls les fichiers PDF et Word sont supportés",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Convert to base64 and save
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const base64Content = result.split(',')[1];
      
      const newFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        content: base64Content,
        created_at: new Date().toISOString()
      };

      const updatedFiles = [newFile, ...uploadedFiles];
      setUploadedFiles(updatedFiles);
      saveUploadedFiles(updatedFiles);

      toast({
        title: "Fichier uploadé",
        description: `${file.name} a été uploadé avec succès`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Analyze document with AI
  const analyzeDocument = async (fileId: string, question?: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('file-analyze', {
        body: {
          fileBase64: file.content,
          fileName: file.name,
          mime: file.type,
          prompt: question || aiQuestion || 'Analyse ce document et fournis un résumé détaillé de son contenu.'
        }
      });

      if (error) throw error;

      const result = data.generatedText;
      setAnalysisResult(result);

      // Save analysis to file
      const updatedFiles = uploadedFiles.map(f => 
        f.id === fileId ? { ...f, analysis: result } : f
      );
      setUploadedFiles(updatedFiles);
      saveUploadedFiles(updatedFiles);

      toast({
        title: "Analyse terminée",
        description: "L'IA a analysé le document avec succès",
      });
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'analyser le document",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Translate document
  const translateDocument = async (fileId: string, targetLang: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file || !file.analysis) {
      toast({
        title: "Erreur",
        description: "Analysez d'abord le document avant de le traduire",
        variant: "destructive",
      });
      return;
    }

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text: file.analysis,
          sourceLang: 'auto',
          targetLang
        }
      });

      if (error) throw error;

      const result = data.translatedText;
      setTranslationResult(result);

      // Save translation to file
      const updatedFiles = uploadedFiles.map(f => 
        f.id === fileId ? { 
          ...f, 
          translations: { ...f.translations, [targetLang]: result } 
        } : f
      );
      setUploadedFiles(updatedFiles);
      saveUploadedFiles(updatedFiles);

      toast({
        title: "Traduction terminée",
        description: `Document traduit vers ${targetLang.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error translating document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traduire le document",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
    }
  };

  // Convert PDF to Word
  const convertPdfToWord = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file || !file.type.includes('pdf')) {
      toast({
        title: "Erreur",
        description: "Seuls les fichiers PDF peuvent être convertis",
        variant: "destructive",
      });
      return;
    }

    setConverting(true);
    try {
      // Use the analysis content to generate a Word document
      const content = file.analysis || 'Contenu extrait du PDF';
      
      const wordDataUri = await DocumentGeneratorService.generateDocument({
        content,
        type: 'docx',
        template: 'report',
        enhanceWithAI: false
      });

      // Create download link
      const link = document.createElement('a');
      link.href = wordDataUri;
      link.download = file.name.replace('.pdf', '.docx');
      link.click();

      toast({
        title: "Conversion terminée",
        description: "PDF converti en document Word",
      });
    } catch (error) {
      console.error('Error converting document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de convertir le document",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const deleteUploadedFile = (id: string) => {
    const updatedFiles = uploadedFiles.filter(file => file.id !== id);
    setUploadedFiles(updatedFiles);
    saveUploadedFiles(updatedFiles);
    
    toast({
      title: "Fichier supprimé",
      description: "Le fichier a été supprimé avec succès",
    });
  };

  // Navigation functions
  const openPreview = (file: UploadedFile) => {
    setSelectedUploadedFile(file);
    setCurrentView('preview');
  };

  const openChat = (file: UploadedFile) => {
    setSelectedUploadedFile(file);
    setCurrentView('chat');
  };

  const backToMain = () => {
    setCurrentView('main');
    setSelectedUploadedFile(null);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFiles = uploadedFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.type.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Conditional rendering based on current view
  if (currentView === 'preview' && selectedUploadedFile) {
    return (
      <DocumentPreview
        file={selectedUploadedFile}
        onBack={backToMain}
        onOpenChat={() => openChat(selectedUploadedFile)}
        onAnalyze={analyzeDocument}
        onTranslate={translateDocument}
        onConvert={convertPdfToWord}
        analyzing={analyzing}
        translating={translating}
        converting={converting}
      />
    );
  }

  if (currentView === 'chat' && selectedUploadedFile) {
    return (
      <DocumentChat
        file={selectedUploadedFile}
        onBack={backToMain}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Traitement de Documents</h1>
            <p className="text-muted-foreground">Générez, analysez et traduisez vos documents avec l'IA</p>
          </div>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload & Analyse
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <FilePlus className="w-4 h-4" />
              Générer
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Fichiers Uploadés
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents Générés
            </TabsTrigger>
          </TabsList>

          {/* Upload & Analysis Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload de Documents
                </CardTitle>
                <CardDescription>
                  Uploadez des fichiers PDF ou Word pour les analyser avec l'IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Sélectionner un fichier</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>

                {selectedFile && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Analyse IA
                </CardTitle>
                <CardDescription>
                  Posez des questions sur le contenu du document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Question pour l'IA</label>
                  <Textarea
                    placeholder="Posez une question sur le document (ex: Résume ce document en 5 points, Quelles sont les informations principales ?)"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => selectedFile && analyzeDocument(uploadedFiles.find(f => f.name === selectedFile.name)?.id || '')}
                    disabled={!selectedFile || analyzing}
                    className="flex-1"
                  >
                    {analyzing ? 'Analyse en cours...' : 'Analyser le Document'}
                  </Button>
                </div>

                {analysisResult && (
                  <div className="p-4 border rounded-lg bg-background">
                    <h4 className="font-medium mb-2">Résultat de l'analyse :</h4>
                    <div className="whitespace-pre-wrap text-sm">{analysisResult}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Translation & Conversion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Translation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Traduction
                  </CardTitle>
                  <CardDescription>
                    Traduisez le contenu analysé
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Langue cible</label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">Anglais</SelectItem>
                        <SelectItem value="es">Espagnol</SelectItem>
                        <SelectItem value="ar">Arabe</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={() => selectedFile && translateDocument(uploadedFiles.find(f => f.name === selectedFile.name)?.id || '', targetLanguage)}
                    disabled={!selectedFile || !analysisResult || translating}
                    className="w-full"
                  >
                    {translating ? 'Traduction en cours...' : 'Traduire'}
                  </Button>

                  {translationResult && (
                    <div className="p-4 border rounded-lg bg-background">
                      <h4 className="font-medium mb-2">Traduction :</h4>
                      <div className="whitespace-pre-wrap text-sm">{translationResult}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PDF to Word Conversion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Conversion
                  </CardTitle>
                  <CardDescription>
                    Convertir PDF vers Word
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Convertissez vos documents PDF en format Word éditable basé sur l'analyse IA.
                  </p>

                  <Button 
                    onClick={() => selectedFile && convertPdfToWord(uploadedFiles.find(f => f.name === selectedFile.name)?.id || '')}
                    disabled={!selectedFile || !analysisResult || converting || !selectedFile?.type.includes('pdf')}
                    className="w-full"
                  >
                    {converting ? 'Conversion en cours...' : 'Convertir PDF → Word'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate">

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
          </TabsContent>

          {/* Uploaded Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fichiers Uploadés</CardTitle>
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
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <FileX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucun fichier uploadé</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fichier</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Taille</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Uploadé le {new Date(file.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {file.type.includes('pdf') ? 'PDF' : 'Word'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {file.analysis && <Badge variant="default" className="bg-green-500 text-xs">Analysé</Badge>}
                              {file.translations && Object.keys(file.translations).length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {Object.keys(file.translations).length} traduction{Object.keys(file.translations).length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPreview(file)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">Aperçu</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openChat(file)}
                                className="flex items-center gap-1"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span className="hidden sm:inline">Chat</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => analyzeDocument(file.id)}
                                disabled={analyzing}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => translateDocument(file.id, 'en')}
                                disabled={!file.analysis || translating}
                              >
                                <Globe className="w-4 h-4" />
                              </Button>
                              {file.type.includes('pdf') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => convertPdfToWord(file.id)}
                                  disabled={!file.analysis || converting}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteUploadedFile(file.id)}
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
          </TabsContent>

          {/* Generated Documents Tab */}
          <TabsContent value="documents">

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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}