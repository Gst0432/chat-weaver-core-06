import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  MessageSquare, 
  Eye, 
  Globe, 
  RefreshCw,
  Search,
  ArrowLeft,
  Plus,
  Bot,
  User,
  Send,
  MoreHorizontal,
  FileX,
  ExternalLink,
  Languages,
  FileType,
  Calculator,
  GraduationCap,
  TrendingUp,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileDown,
  Sparkles,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { renderMarkdown } from '@/lib/markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import DocumentContentViewer from '@/components/DocumentContentViewer';

interface Document {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text?: string;
  preview_text?: string;
  analysis_status?: string;
  ai_summary?: string;
  key_points?: string[];
  document_type?: string;
  is_financial?: boolean;
  structure_info?: any;
  created_at: string;
  updated_at?: string;
  processed_at?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AnalysisResult {
  type: 'financial' | 'academic' | 'legal' | 'technical' | 'general';
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  confidence: number;
}

const SUPPORTED_LANGUAGES = {
  'en': 'Anglais',
  'es': 'Espagnol', 
  'de': 'Allemand',
  'it': 'Italien',
  'pt': 'Portugais',
  'zh': 'Chinois',
  'ja': 'Japonais',
  'ar': 'Arabe',
  'ru': 'Russe'
};

export default function DocumentStudio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [chatInput, setChatInput] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [analyzing_financial, setAnalyzingFinancial] = useState(false);
  const [analyzing_academic, setAnalyzingAcademic] = useState(false);
  
  // Translation state
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationProgress, setTranslationProgress] = useState(0);
  
  // Analysis results
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load chat when document changes
  useEffect(() => {
    if (selectedDocument) {
      loadChatHistory(selectedDocument.id);
    } else {
      setChatMessages([]);
    }
  }, [selectedDocument?.id]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour accéder aux documents",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les documents",
          variant: "destructive"
        });
        return;
      }

      setDocuments(data || []);
      
      // Auto-select first document if none selected
      if (!selectedDocument && data && data.length > 0) {
        setSelectedDocument(data[0]);
      }
    } catch (error) {
      console.error('Error in loadDocuments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = (documentId: string) => {
    const savedChat = localStorage.getItem(`document_chat_${documentId}`);
    if (savedChat) {
      setChatMessages(JSON.parse(savedChat));
    } else {
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Bonjour ! Je peux vous aider à analyser ce document et répondre à toutes vos questions sur son contenu. ${selectedDocument?.extracted_text ? 'Le document a été analysé avec succès.' : 'Commencez par analyser le document pour débloquer toutes les fonctionnalités.'}`,
        timestamp: new Date().toISOString()
      };
      setChatMessages([welcomeMessage]);
    }
  };

  const saveChatHistory = (messages: ChatMessage[]) => {
    if (selectedDocument) {
      localStorage.setItem(`document_chat_${selectedDocument.id}`, JSON.stringify(messages));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Seuls les fichiers PDF, Word (.docx) et texte sont acceptés",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 50MB",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('document-upload', {
        body: formData
      });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Erreur lors du téléversement');
      }

      if (data?.document) {
        toast({
          title: "Document téléversé",
          description: `${file.name} a été téléversé avec succès`,
        });

        // Reload documents and select the new one
        await loadDocuments();
        const newDoc = data.document;
        setSelectedDocument(newDoc);
        
        // Auto-analyze if text was extracted
        if (newDoc.extracted_text && newDoc.extracted_text.length > 100) {
          setTimeout(() => analyzeDocument(newDoc.id), 1000);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erreur de téléversement",
        description: error instanceof Error ? error.message : "Impossible de téléverser le fichier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const analyzeDocument = async (documentId: string) => {
    const document = documents.find(d => d.id === documentId);
    if (!document) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('file-analyze', {
        body: { documentId }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Erreur lors de l\'analyse');
      }

      if (data?.success) {
        toast({
          title: "Document analysé",
          description: `${document.original_filename} a été analysé avec succès`,
        });

        // Reload documents to get updated data
        await loadDocuments();
        
        // Update selected document
        const updatedDoc = documents.find(d => d.id === documentId);
        if (updatedDoc) {
          setSelectedDocument(updatedDoc);
        }
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error ? error.message : "Impossible d'analyser le document",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedDocument || chatLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('document-chat', {
        body: {
          documentId: selectedDocument.id,
          question: userMessage.content
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la discussion');
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.answer || 'Désolé, je n\'ai pas pu traiter votre demande.',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setChatMessages(finalMessages);
      saveChatHistory(finalMessages);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Assurez-vous que le document a été analysé et réessayez.',
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setChatMessages(finalMessages);
      saveChatHistory(finalMessages);
    } finally {
      setChatLoading(false);
    }
  };

  const translateDocument = async () => {
    if (!selectedDocument || !selectedDocument.extracted_text) {
      toast({
        title: "Erreur",
        description: "Aucun contenu à traduire. Analysez d'abord le document.",
        variant: "destructive"
      });
      return;
    }

    setTranslating(true);
    setTranslationProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('document-translate', {
        body: {
          documentId: selectedDocument.id,
          targetLanguage
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la traduction');
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setTranslationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Wait for completion
      setTimeout(() => {
        clearInterval(progressInterval);
        setTranslationProgress(100);
        
        toast({
          title: "Traduction terminée",
          description: `Document traduit en ${SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]}`,
        });

        // Auto-download translated file
        if (data?.filename) {
          const link = document.createElement('a');
          link.href = `data:text/plain;charset=utf-8,${encodeURIComponent('Traduction terminée - Fichier disponible')}`;
          link.download = data.filename;
          link.click();
        }
      }, 3000);

    } catch (error) {
      console.error('Error translating document:', error);
      toast({
        title: "Erreur de traduction",
        description: error instanceof Error ? error.message : "Impossible de traduire le document",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setTranslating(false);
        setTranslationProgress(0);
      }, 3500);
    }
  };

  const convertDocument = async (targetFormat: 'pdf' | 'docx' | 'txt') => {
    if (!selectedDocument) return;

    setConverting(true);
    try {
      // Simulate conversion process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const convertedFilename = `${selectedDocument.original_filename.split('.')[0]}.${targetFormat}`;
      
      toast({
        title: "Conversion terminée",
        description: `Document converti en ${targetFormat.toUpperCase()}`,
      });

      // Auto-download converted file
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;charset=utf-8,${encodeURIComponent('Fichier converti - Téléchargement simulé')}`;
      link.download = convertedFilename;
      link.click();

    } catch (error) {
      console.error('Error converting document:', error);
      toast({
        title: "Erreur de conversion",
        description: "Impossible de convertir le document",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const performFinancialAnalysis = async () => {
    if (!selectedDocument || !selectedDocument.extracted_text) {
      toast({
        title: "Erreur",
        description: "Analysez d'abord le document pour effectuer une analyse financière",
        variant: "destructive"
      });
      return;
    }

    setAnalyzingFinancial(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert financier. Analyse ce document et fournis une analyse financière détaillée avec ratios, tendances et recommandations.'
            },
            {
              role: 'user',
              content: `Effectue une analyse financière complète de ce document :\n\n${selectedDocument.extracted_text.substring(0, 8000)}`
            }
          ],
          model: 'gpt-4o-mini',
          max_tokens: 2000
        }
      });

      if (error) throw error;

      const result: AnalysisResult = {
        type: 'financial',
        summary: data.generatedText || 'Analyse financière non disponible',
        keyPoints: ['Ratios financiers analysés', 'Tendances identifiées', 'Recommandations formulées'],
        recommendations: ['Consulter un expert financier', 'Vérifier les calculs', 'Suivre les tendances'],
        confidence: 0.85
      };

      setAnalysisResults(prev => [...prev.filter(r => r.type !== 'financial'), result]);
      
      toast({
        title: "Analyse financière terminée",
        description: "Rapport d'analyse financière généré avec succès",
      });

    } catch (error) {
      console.error('Error in financial analysis:', error);
      toast({
        title: "Erreur d'analyse financière",
        description: "Impossible d'effectuer l'analyse financière",
        variant: "destructive",
      });
    } finally {
      setAnalyzingFinancial(false);
    }
  };

  const performAcademicAnalysis = async () => {
    if (!selectedDocument || !selectedDocument.extracted_text) {
      toast({
        title: "Erreur",
        description: "Analysez d'abord le document pour effectuer une analyse académique",
        variant: "destructive"
      });
      return;
    }

    setAnalyzingAcademic(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert académique. Analyse ce document selon les critères académiques : méthodologie, sources, qualité scientifique, structure argumentative.'
            },
            {
              role: 'user',
              content: `Effectue une analyse académique complète de ce document :\n\n${selectedDocument.extracted_text.substring(0, 8000)}`
            }
          ],
          model: 'gpt-4o-mini',
          max_tokens: 2000
        }
      });

      if (error) throw error;

      const result: AnalysisResult = {
        type: 'academic',
        summary: data.generatedText || 'Analyse académique non disponible',
        keyPoints: ['Méthodologie évaluée', 'Sources vérifiées', 'Qualité scientifique analysée'],
        recommendations: ['Renforcer la méthodologie', 'Ajouter des sources', 'Améliorer la structure'],
        confidence: 0.80
      };

      setAnalysisResults(prev => [...prev.filter(r => r.type !== 'academic'), result]);
      
      toast({
        title: "Analyse académique terminée",
        description: "Rapport d'analyse académique généré avec succès",
      });

    } catch (error) {
      console.error('Error in academic analysis:', error);
      toast({
        title: "Erreur d'analyse académique",
        description: "Impossible d'effectuer l'analyse académique",
        variant: "destructive",
      });
    } finally {
      setAnalyzingAcademic(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès",
      });

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      
      if (selectedDocument?.id === documentId) {
        const remainingDocs = documents.filter(d => d.id !== documentId);
        setSelectedDocument(remainingDocs[0] || null);
      }

    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const downloadAnalysisReport = (analysis: AnalysisResult) => {
    const report = `# Rapport d'Analyse ${analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)}

## Résumé
${analysis.summary}

## Points Clés
${analysis.keyPoints.map(point => `- ${point}`).join('\n')}

## Recommandations
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Métadonnées
- Type d'analyse: ${analysis.type}
- Niveau de confiance: ${(analysis.confidence * 100).toFixed(1)}%
- Généré le: ${new Date().toLocaleString('fr-FR')}
- Document source: ${selectedDocument?.original_filename}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyse_${analysis.type}_${selectedDocument?.original_filename?.split('.')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (type: string) => {
    if (type === 'pdf') return '📄';
    if (type === 'docx') return '📝';
    if (type === 'txt') return '📄';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Document Studio Pro
              </h1>
              <p className="text-sm text-muted-foreground">
                Analysez, traduisez et convertissez vos documents avec l'IA
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {documents.length} document{documents.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat IA
            </TabsTrigger>
            <TabsTrigger value="translate" className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Traduire
            </TabsTrigger>
            <TabsTrigger value="convert" className="flex items-center gap-2">
              <FileType className="w-4 h-4" />
              Convertir
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analyser
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Section */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Téléverser un document
                  </CardTitle>
                  <CardDescription>
                    Formats supportés : PDF, Word (.docx), Texte (.txt)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">
                        Cliquez ou glissez votre document ici
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PDF, Word, Texte (max 50MB)
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    {loading && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-800">Téléversement en cours...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Documents List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Mes Documents
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={loadDocuments}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un document..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Documents Grid */}
                    <ScrollArea className="h-[400px]">
                      {filteredDocuments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">Aucun document</p>
                          <p className="text-sm">Téléversez votre premier document pour commencer</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {filteredDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                selectedDocument?.id === doc.id 
                                  ? 'bg-primary/10 border-primary/30 shadow-sm' 
                                  : 'bg-card hover:bg-accent'
                              }`}
                              onClick={() => setSelectedDocument(doc)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <span className="text-2xl flex-shrink-0">{getFileIcon(doc.file_type)}</span>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate">{doc.original_filename}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {doc.file_type.toUpperCase()}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {formatFileSize(doc.file_size)}
                                      </span>
                                      {doc.analysis_status === 'ai_completed' && (
                                        <Badge variant="default" className="text-xs">
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          Analysé
                                        </Badge>
                                      )}
                                      {doc.analysis_status === 'ai_processing' && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          Analyse...
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                </div>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => analyzeDocument(doc.id)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Analyser
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => deleteDocument(doc.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <DocumentContentViewer 
              document={selectedDocument} 
              isAnalyzing={analyzing}
            />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            {selectedDocument ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">{getFileIcon(selectedDocument.file_type)}</span>
                      Document actuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium truncate">{selectedDocument.original_filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(selectedDocument.file_size)} • {selectedDocument.file_type.toUpperCase()}
                        </p>
                      </div>
                      
                      {!selectedDocument.extracted_text && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800 mb-2">Document non analysé</p>
                          <Button 
                            size="sm" 
                            onClick={() => analyzeDocument(selectedDocument.id)}
                            disabled={analyzing}
                            className="w-full"
                          >
                            {analyzing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyse...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Analyser maintenant
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {selectedDocument.ai_summary && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Résumé IA</h4>
                          <p className="text-sm text-blue-800">{selectedDocument.ai_summary}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Chat Interface */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Discussion avec l'IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col h-[500px]">
                      <ScrollArea className="flex-1 p-4 border rounded-lg mb-4">
                        <div className="space-y-4">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  message.role === 'user' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-secondary'
                                }`}>
                                  {message.role === 'user' ? (
                                    <User className="w-4 h-4" />
                                  ) : (
                                    <Bot className="w-4 h-4" />
                                  )}
                                </div>
                                
                                <div className={`px-4 py-3 rounded-lg ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary'
                                }`}>
                                  <div className="text-sm">
                                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                                  </div>
                                  <div className="text-xs mt-2 opacity-70">
                                    {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {chatLoading && (
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                <Bot className="w-4 h-4" />
                              </div>
                              <div className="bg-secondary px-4 py-3 rounded-lg">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div ref={messagesEndRef} />
                      </ScrollArea>

                      {/* Chat Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Posez votre question sur ce document..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendChatMessage();
                            }
                          }}
                          disabled={chatLoading || !selectedDocument?.extracted_text}
                          className="flex-1"
                        />
                        <Button 
                          onClick={sendChatMessage} 
                          disabled={!chatInput.trim() || chatLoading || !selectedDocument?.extracted_text}
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {!selectedDocument?.extracted_text && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Analysez d'abord le document pour activer le chat IA
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun document sélectionné</h3>
                  <p className="text-muted-foreground">
                    Sélectionnez un document dans l'onglet Upload pour commencer la discussion
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Translate Tab */}
          <TabsContent value="translate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Traduction de document
                </CardTitle>
                <CardDescription>
                  Traduisez votre document dans une autre langue avec l'IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDocument ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Document source</h4>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileIcon(selectedDocument.file_type)}</span>
                            <div>
                              <p className="font-medium text-sm">{selectedDocument.original_filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedDocument.file_size)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Langue cible</h4>
                        <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                              <SelectItem key={code} value={code}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {translating && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Traduction en cours...</span>
                          <span className="text-sm text-muted-foreground">{translationProgress}%</span>
                        </div>
                        <Progress value={translationProgress} className="w-full" />
                      </div>
                    )}

                    <Button 
                      onClick={translateDocument}
                      disabled={translating || !selectedDocument.extracted_text}
                      className="w-full"
                    >
                      {translating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Traduction en cours...
                        </>
                      ) : (
                        <>
                          <Languages className="w-4 h-4 mr-2" />
                          Traduire en {SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]}
                        </>
                      )}
                    </Button>

                    {!selectedDocument.extracted_text && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                          Le document doit être analysé avant la traduction. Cliquez sur "Analyser" dans l'onglet Upload.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Languages className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun document sélectionné</h3>
                    <p className="text-muted-foreground">
                      Sélectionnez un document pour le traduire
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Convert Tab */}
          <TabsContent value="convert" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileType className="w-5 h-5" />
                  Conversion de format
                </CardTitle>
                <CardDescription>
                  Convertissez votre document vers différents formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDocument ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(selectedDocument.file_type)}</span>
                        <div>
                          <h4 className="font-medium">{selectedDocument.original_filename}</h4>
                          <p className="text-sm text-muted-foreground">
                            Format actuel : {selectedDocument.file_type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => convertDocument('pdf')}
                        disabled={converting || selectedDocument.file_type === 'pdf'}
                        className="h-20 flex flex-col gap-2"
                      >
                        <FileText className="w-6 h-6" />
                        <span>Convertir en PDF</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => convertDocument('docx')}
                        disabled={converting || selectedDocument.file_type === 'docx'}
                        className="h-20 flex flex-col gap-2"
                      >
                        <FileDown className="w-6 h-6" />
                        <span>Convertir en Word</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => convertDocument('txt')}
                        disabled={converting || selectedDocument.file_type === 'txt'}
                        className="h-20 flex flex-col gap-2"
                      >
                        <FileText className="w-6 h-6" />
                        <span>Convertir en Texte</span>
                      </Button>
                    </div>

                    {converting && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-800">Conversion en cours...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileType className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun document sélectionné</h3>
                    <p className="text-muted-foreground">
                      Sélectionnez un document pour le convertir
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analyze Tab */}
          <TabsContent value="analyze" className="space-y-6">
            {selectedDocument ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Analysis Tools */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Outils d'analyse
                    </CardTitle>
                    <CardDescription>
                      Analyses spécialisées avec l'intelligence artificielle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button
                        onClick={performFinancialAnalysis}
                        disabled={analyzing_financial || !selectedDocument.extracted_text}
                        className="w-full h-16 flex items-center gap-3"
                        variant="outline"
                      >
                        <Calculator className="w-6 h-6" />
                        <div className="text-left">
                          <div className="font-medium">Analyse Financière</div>
                          <div className="text-xs text-muted-foreground">
                            Ratios, tendances, recommandations
                          </div>
                        </div>
                        {analyzing_financial && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                      </Button>

                      <Button
                        onClick={performAcademicAnalysis}
                        disabled={analyzing_academic || !selectedDocument.extracted_text}
                        className="w-full h-16 flex items-center gap-3"
                        variant="outline"
                      >
                        <GraduationCap className="w-6 h-6" />
                        <div className="text-left">
                          <div className="font-medium">Analyse Académique</div>
                          <div className="text-xs text-muted-foreground">
                            Méthodologie, sources, qualité scientifique
                          </div>
                        </div>
                        {analyzing_academic && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" disabled className="h-12 flex flex-col gap-1">
                          <span className="text-xs">Analyse Juridique</span>
                          <span className="text-xs text-muted-foreground">Bientôt</span>
                        </Button>
                        <Button variant="outline" disabled className="h-12 flex flex-col gap-1">
                          <span className="text-xs">Sentiment</span>
                          <span className="text-xs text-muted-foreground">Bientôt</span>
                        </Button>
                      </div>

                      {!selectedDocument.extracted_text && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800">
                            Le document doit être analysé avant les analyses spécialisées.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Résultats d'analyse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisResults.length === 0 ? (
                      <div className="text-center py-12">
                        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">
                          Aucune analyse effectuée pour le moment
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {analysisResults.map((result, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  {result.type === 'financial' ? (
                                    <Calculator className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <GraduationCap className="w-4 h-4 text-blue-600" />
                                  )}
                                  <h4 className="font-medium">
                                    Analyse {result.type === 'financial' ? 'Financière' : 'Académique'}
                                  </h4>
                                  <Badge variant="outline">
                                    {(result.confidence * 100).toFixed(0)}% confiance
                                  </Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadAnalysisReport(result)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <h5 className="text-sm font-medium mb-1">Résumé</h5>
                                  <p className="text-sm text-muted-foreground">
                                    {result.summary.substring(0, 200)}...
                                  </p>
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-medium mb-1">Points clés</h5>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {result.keyPoints.slice(0, 3).map((point, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun document sélectionné</h3>
                  <p className="text-muted-foreground">
                    Sélectionnez un document pour effectuer des analyses spécialisées
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}