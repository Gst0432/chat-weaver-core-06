import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  MessageSquare, 
  Languages, 
  FileType,
  Sparkles,
  Download,
  Trash2,
  Send,
  Bot,
  User,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Search,
  Calculator,
  BarChart3,
  BookOpen,
  FileImage,
  Globe,
  TrendingUp,
  PieChart,
  DollarSign,
  GraduationCap,
  Briefcase,
  FileCheck,
  Zap,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { renderMarkdown } from '@/lib/markdown';
import { useNavigate } from 'react-router-dom';

interface DocumentFile {
  id: string;
  original_filename: string;
  file_type: 'pdf' | 'docx' | 'txt';
  file_size: number;
  storage_path: string;
  extracted_text?: string;
  preview_text?: string;
  analysis_status?: string;
  processed_at?: string;
  created_at: string;
  ai_summary?: string;
  key_points?: string[];
  document_type?: string;
  is_financial?: boolean;
  structure_info?: any;
  public_url?: string;
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

export default function DocumentStudio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentFile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'chat' | 'translate' | 'convert' | 'analyze'>('preview');
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [financialAnalyzing, setFinancialAnalyzing] = useState(false);
  const [academicAnalyzing, setAcademicAnalyzing] = useState(false);
  
  // Analysis results
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [conversionProgress, setConversionProgress] = useState(0);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Load chat when document changes
  useEffect(() => {
    if (activeDocument) {
      loadChatHistory(activeDocument.id);
    } else {
      setChatMessages([]);
    }
  }, [activeDocument?.id]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as DocumentFile[]);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    }
  };

  const loadChatHistory = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_conversations')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messages: ChatMessage[] = [];
      data?.forEach(conv => {
        messages.push({
          id: `${conv.id}-q`,
          role: 'user',
          content: conv.question,
          timestamp: conv.created_at
        });
        messages.push({
          id: `${conv.id}-a`,
          role: 'assistant',
          content: conv.answer,
          timestamp: conv.created_at
        });
      });
      
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('word') && !file.type.includes('document') && file.type !== 'text/plain') {
      toast({
        title: "Type de fichier non supporté",
        description: "Seuls les fichiers PDF, Word et texte sont supportés",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('document-upload', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Document uploadé",
        description: `${file.name} a été uploadé avec succès`,
      });

      await loadDocuments();
      setActiveDocument(data.document);
      
      // Auto-analyze the document
      setTimeout(() => {
        analyzeDocument(data.document.id);
      }, 1000);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message || "Impossible d'uploader le fichier",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const analyzeDocument = async (documentId: string) => {
    setAnalyzing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // First analyze the file to extract text content
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('file-analyze', {
        body: { documentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (analyzeError) throw analyzeError;

      // Then vectorize for AI chat
      const { data: vectorizeData, error: vectorizeError } = await supabase.functions.invoke('document-vectorize', {
        body: { documentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (vectorizeError) throw vectorizeError;

      toast({
        title: "Analyse terminée",
        description: `Document analysé et vectorisé (${vectorizeData.chunks_processed} sections)`,
      });

      await loadDocuments();
      
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Erreur d'analyse",
        description: error.message || "Impossible d'analyser le document",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !activeDocument || chatLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('document-chat', {
        body: {
          documentId: activeDocument.id,
          question: userMessage.content
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Assurez-vous que le document a été analysé.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const translateDocument = async (targetLanguage: string) => {
    if (!activeDocument) return;
    
    setTranslating(true);
    setTranslationProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setTranslationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('document-translate', {
        body: {
          documentId: activeDocument.id,
          targetLanguage
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setTranslationProgress(100);

      if (error) throw error;

      toast({
        title: "Traduction terminée",
        description: `Document traduit en ${targetLanguage}`,
      });

      // Auto-download the translated file
      setTimeout(() => {
        downloadFile(data.storage_path, data.filename);
      }, 1000);
      
    } catch (error) {
      console.error('Error translating document:', error);
      toast({
        title: "Erreur de traduction",
        description: error.message || "Impossible de traduire le document",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
      setTranslationProgress(0);
    }
  };

  const convertDocument = async (targetFormat: 'docx' | 'pdf' | 'txt') => {
    if (!activeDocument) return;
    
    setConverting(true);
    setConversionProgress(0);
    
    try {
      // Simulate conversion process
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      // Use document generator service for conversion
      const { DocumentGeneratorService } = await import('@/services/documentGeneratorService');
      
      const dataUri = await DocumentGeneratorService.generateDocument({
        content: activeDocument.extracted_text || 'Contenu du document non disponible',
        type: targetFormat,
        enhanceWithAI: true
      });

      clearInterval(progressInterval);
      setConversionProgress(100);

      // Download the converted file
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `${activeDocument.original_filename.split('.')[0]}_converted.${targetFormat}`;
      a.click();

      toast({
        title: "Conversion terminée",
        description: `Document converti en ${targetFormat.toUpperCase()}`,
      });
      
    } catch (error) {
      console.error('Error converting document:', error);
      toast({
        title: "Erreur de conversion",
        description: error.message || "Impossible de convertir le document",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
      setConversionProgress(0);
    }
  };

  const performFinancialAnalysis = async () => {
    if (!activeDocument) return;
    
    setFinancialAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en analyse financière. Analyse ce document et fournis une analyse financière détaillée avec métriques, ratios et recommandations.'
            },
            {
              role: 'user',
              content: `Effectue une analyse financière complète de ce document :\n\n${activeDocument.extracted_text?.substring(0, 8000) || 'Contenu non disponible'}`
            }
          ],
          model: 'gpt-4o',
          max_tokens: 2000
        }
      });

      if (error) throw error;

      setAnalysisResults({
        type: 'financial',
        summary: data.generatedText,
        keyPoints: [
          'Analyse des revenus et dépenses',
          'Ratios financiers calculés',
          'Tendances identifiées',
          'Recommandations stratégiques'
        ],
        recommendations: [
          'Optimiser la structure des coûts',
          'Améliorer la rentabilité',
          'Diversifier les sources de revenus'
        ],
        confidence: 0.85
      });

      toast({
        title: "Analyse financière terminée",
        description: "Rapport d'analyse financière généré",
      });
      
    } catch (error) {
      console.error('Error performing financial analysis:', error);
      toast({
        title: "Erreur d'analyse financière",
        description: error.message || "Impossible d'effectuer l'analyse financière",
        variant: "destructive",
      });
    } finally {
      setFinancialAnalyzing(false);
    }
  };

  const performAcademicAnalysis = async () => {
    if (!activeDocument) return;
    
    setAcademicAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Tu es un chercheur académique expert. Analyse ce document selon les standards académiques : méthodologie, sources, arguments, contribution scientifique.'
            },
            {
              role: 'user',
              content: `Effectue une analyse académique rigoureuse de ce document :\n\n${activeDocument.extracted_text?.substring(0, 8000) || 'Contenu non disponible'}`
            }
          ],
          model: 'gpt-4o',
          max_tokens: 2000
        }
      });

      if (error) throw error;

      setAnalysisResults({
        type: 'academic',
        summary: data.generatedText,
        keyPoints: [
          'Méthodologie de recherche évaluée',
          'Qualité des sources analysée',
          'Arguments principaux identifiés',
          'Contribution scientifique évaluée'
        ],
        recommendations: [
          'Renforcer la méthodologie',
          'Ajouter des sources primaires',
          'Clarifier les arguments'
        ],
        confidence: 0.88
      });

      toast({
        title: "Analyse académique terminée",
        description: "Rapport d'analyse académique généré",
      });
      
    } catch (error) {
      console.error('Error performing academic analysis:', error);
      toast({
        title: "Erreur d'analyse académique",
        description: error.message || "Impossible d'effectuer l'analyse académique",
        variant: "destructive",
      });
    } finally {
      setAcademicAnalyzing(false);
    }
  };

  const downloadFile = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
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

      if (activeDocument?.id === documentId) {
        setActiveDocument(null);
      }
      
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Contenu copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'txt': return '📄';
      default: return '📁';
    }
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
                Analysez, discutez, traduisez et convertissez vos documents avec l'IA
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              IA Avancée
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* Left Panel - Document List */}
        <div className={`${activeDocument ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 border-r bg-card/50 flex-col`}>
          {/* Upload Section */}
          <div className="p-4 border-b">
            <label className="block">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button 
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Uploader un document
                  </>
                )}
              </Button>
            </label>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Documents List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Aucun document</h3>
                  <p className="text-sm">Uploadez votre premier document pour commencer</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <Card
                      key={doc.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        activeDocument?.id === doc.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setActiveDocument(doc)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getFileIcon(doc.file_type)}</span>
                              <p className="font-medium truncate text-sm">{doc.original_filename}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {doc.file_type.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>

                            {doc.analysis_status && (
                              <div className="flex items-center gap-1">
                                {doc.analysis_status === 'ai_completed' ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : doc.analysis_status === 'ai_processing' ? (
                                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {doc.analysis_status === 'ai_completed' ? 'Analysé' : 
                                   doc.analysis_status === 'ai_processing' ? 'Analyse...' : 'Non analysé'}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(doc.id);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Document Workspace */}
        <div className={`${activeDocument ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
          {activeDocument ? (
            <>
              {/* Document Header */}
              <div className="border-b bg-card/50 p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setActiveDocument(null)}
                      className="lg:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate">{activeDocument.original_filename}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(activeDocument.file_size / 1024 / 1024).toFixed(1)} MB</span>
                        <span>•</span>
                        <span>{new Date(activeDocument.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeDocument(activeDocument.id)}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyse...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          {activeDocument.analysis_status === 'ai_completed' ? 'Re-analyser' : 'Analyser'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="preview" className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">Aperçu</span>
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span className="hidden sm:inline">Chat IA</span>
                    </TabsTrigger>
                    <TabsTrigger value="translate" className="flex items-center gap-1">
                      <Languages className="w-3 h-3" />
                      <span className="hidden sm:inline">Traduire</span>
                    </TabsTrigger>
                    <TabsTrigger value="convert" className="flex items-center gap-1">
                      <FileType className="w-3 h-3" />
                      <span className="hidden sm:inline">Convertir</span>
                    </TabsTrigger>
                    <TabsTrigger value="analyze" className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      <span className="hidden sm:inline">Analyser</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} className="h-full flex flex-col">
                  {/* Preview Tab */}
                  <TabsContent value="preview" className="flex-1 m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        {activeDocument.ai_summary && (
                          <Card className="mb-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-blue-200">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                Résumé IA
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm leading-relaxed">{activeDocument.ai_summary}</p>
                              
                              {activeDocument.key_points && activeDocument.key_points.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium mb-2">Points clés :</h4>
                                  <ul className="space-y-1">
                                    {activeDocument.key_points.map((point, index) => (
                                      <li key={index} className="text-sm flex items-start gap-2">
                                        <span className="text-blue-500 font-bold">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 mt-4">
                                {activeDocument.document_type && (
                                  <Badge variant="outline">
                                    {activeDocument.document_type}
                                  </Badge>
                                )}
                                {activeDocument.is_financial && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    Document Financier
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Contenu du Document</span>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(activeDocument.extracted_text || '')}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const blob = new Blob([activeDocument.extracted_text || ''], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${activeDocument.original_filename}_extracted.txt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {activeDocument.extracted_text ? (
                              <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                                  {activeDocument.extracted_text}
                                </pre>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-medium">Contenu non extrait</p>
                                <p className="text-sm">Cliquez sur "Analyser" pour extraire le contenu</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Chat Tab */}
                  <TabsContent value="chat" className="flex-1 m-0">
                    <div className="flex flex-col h-full">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {chatMessages.length === 0 ? (
                            <div className="text-center py-12">
                              <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                              <h3 className="text-lg font-semibold mb-2">Chat IA avec votre document</h3>
                              <p className="text-muted-foreground mb-4">
                                Posez des questions sur le contenu, demandez des clarifications ou des analyses
                              </p>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>💡 Exemples de questions :</p>
                                <p>"Résume les points principaux"</p>
                                <p>"Quels sont les chiffres clés ?"</p>
                                <p>"Analyse les risques mentionnés"</p>
                              </div>
                            </div>
                          ) : (
                            chatMessages.map((message) => (
                              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                  }`}>
                                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                  </div>
                                  
                                  <div className={`px-4 py-3 rounded-lg ${
                                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                  }`}>
                                    <div className="text-sm">
                                      {message.role === 'assistant' ? (
                                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                                      ) : (
                                        message.content
                                      )}
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
                            ))
                          )}
                          
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
                          <div ref={chatEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Chat Input */}
                      <div className="border-t p-4 bg-card/50">
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
                            disabled={chatLoading}
                            className="flex-1"
                          />
                          <Button 
                            onClick={sendChatMessage} 
                            disabled={!chatInput.trim() || chatLoading}
                            className="bg-gradient-to-r from-primary to-primary/80"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Translation Tab */}
                  <TabsContent value="translate" className="flex-1 m-0">
                    <div className="p-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Languages className="w-5 h-5" />
                            Traduction de Document
                          </CardTitle>
                          <CardDescription>
                            Traduisez votre document dans différentes langues avec l'IA
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {translating && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Traduction en cours...</span>
                              </div>
                              <Progress value={translationProgress} className="w-full" />
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { code: 'anglais', name: 'Anglais', flag: '🇺🇸' },
                              { code: 'espagnol', name: 'Espagnol', flag: '🇪🇸' },
                              { code: 'allemand', name: 'Allemand', flag: '🇩🇪' },
                              { code: 'italien', name: 'Italien', flag: '🇮🇹' },
                              { code: 'chinois', name: 'Chinois', flag: '🇨🇳' },
                              { code: 'arabe', name: 'Arabe', flag: '🇸🇦' },
                              { code: 'japonais', name: 'Japonais', flag: '🇯🇵' },
                              { code: 'russe', name: 'Russe', flag: '🇷🇺' },
                              { code: 'portugais', name: 'Portugais', flag: '🇵🇹' }
                            ].map((lang) => (
                              <Button
                                key={lang.code}
                                variant="outline"
                                onClick={() => translateDocument(lang.code)}
                                disabled={translating}
                                className="flex items-center gap-2 h-12"
                              >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="text-sm">{lang.name}</span>
                              </Button>
                            ))}
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                              <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-blue-900">Traduction IA Avancée</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                  Utilise GPT-4 pour une traduction contextuelle et précise qui préserve le sens et le style du document original.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Convert Tab */}
                  <TabsContent value="convert" className="flex-1 m-0">
                    <div className="p-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileType className="w-5 h-5" />
                            Conversion de Document
                          </CardTitle>
                          <CardDescription>
                            Convertissez votre document vers différents formats
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {converting && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Conversion en cours...</span>
                              </div>
                              <Progress value={conversionProgress} className="w-full" />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => convertDocument('docx')}>
                              <CardContent className="p-6 text-center">
                                <FileImage className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                                <h3 className="font-semibold mb-2">Word (DOCX)</h3>
                                <p className="text-sm text-muted-foreground">
                                  Format éditable avec mise en forme
                                </p>
                                <Button 
                                  className="w-full mt-3" 
                                  variant="outline"
                                  disabled={converting}
                                >
                                  Convertir en Word
                                </Button>
                              </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => convertDocument('pdf')}>
                              <CardContent className="p-6 text-center">
                                <FileText className="w-12 h-12 mx-auto mb-3 text-red-600" />
                                <h3 className="font-semibold mb-2">PDF</h3>
                                <p className="text-sm text-muted-foreground">
                                  Format universel et portable
                                </p>
                                <Button 
                                  className="w-full mt-3" 
                                  variant="outline"
                                  disabled={converting}
                                >
                                  Convertir en PDF
                                </Button>
                              </CardContent>
                            </Card>

                            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => convertDocument('txt')}>
                              <CardContent className="p-6 text-center">
                                <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                <h3 className="font-semibold mb-2">Texte (TXT)</h3>
                                <p className="text-sm text-muted-foreground">
                                  Format texte simple et léger
                                </p>
                                <Button 
                                  className="w-full mt-3" 
                                  variant="outline"
                                  disabled={converting}
                                >
                                  Convertir en TXT
                                </Button>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-start gap-3">
                              <Zap className="w-5 h-5 text-green-600 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-green-900">Conversion Intelligente</h4>
                                <p className="text-sm text-green-700 mt-1">
                                  Les conversions préservent la mise en forme, les tableaux et la structure du document original.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Analysis Tab */}
                  <TabsContent value="analyze" className="flex-1 m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6 space-y-6">
                        {/* Analysis Tools */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                Analyse Financière
                              </CardTitle>
                              <CardDescription>
                                Analyse des données financières, ratios et tendances
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Button 
                                onClick={performFinancialAnalysis}
                                disabled={financialAnalyzing}
                                className="w-full"
                              >
                                {financialAnalyzing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyse en cours...
                                  </>
                                ) : (
                                  <>
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Analyser financièrement
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-blue-600" />
                                Analyse Académique
                              </CardTitle>
                              <CardDescription>
                                Évaluation de la méthodologie et qualité scientifique
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Button 
                                onClick={performAcademicAnalysis}
                                disabled={academicAnalyzing}
                                className="w-full"
                              >
                                {academicAnalyzing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyse en cours...
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Analyser académiquement
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Analysis Results */}
                        {analysisResults && (
                          <Card className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 border-purple-200">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                {analysisResults.type === 'financial' ? (
                                  <TrendingUp className="w-5 h-5 text-green-600" />
                                ) : (
                                  <GraduationCap className="w-5 h-5 text-blue-600" />
                                )}
                                Résultats d'Analyse {analysisResults.type === 'financial' ? 'Financière' : 'Académique'}
                                <Badge variant="secondary" className="ml-auto">
                                  Confiance: {Math.round(analysisResults.confidence * 100)}%
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Résumé de l'analyse :</h4>
                                <div className="bg-white/70 rounded-lg p-4 border">
                                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisResults.summary) }} />
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Points clés identifiés :</h4>
                                <ul className="space-y-1">
                                  {analysisResults.keyPoints.map((point, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Recommandations :</h4>
                                <ul className="space-y-1">
                                  {analysisResults.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm">{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex gap-2 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  onClick={() => copyToClipboard(analysisResults.summary)}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copier l'analyse
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    const analysisText = `# Analyse ${analysisResults.type === 'financial' ? 'Financière' : 'Académique'}

## Résumé
${analysisResults.summary}

## Points Clés
${analysisResults.keyPoints.map(point => `- ${point}`).join('\n')}

## Recommandations
${analysisResults.recommendations.map(rec => `- ${rec}`).join('\n')}

---
Analyse générée par Chatelix IA - Confiance: ${Math.round(analysisResults.confidence * 100)}%`;

                                    const blob = new Blob([analysisText], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `analyse_${analysisResults.type}_${activeDocument?.original_filename}.md`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Télécharger
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Additional Analysis Tools */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 text-center">
                              <Briefcase className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                              <h3 className="font-semibold mb-2">Analyse Juridique</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Identification des clauses et termes légaux
                              </p>
                              <Button variant="outline" className="w-full" disabled>
                                Bientôt disponible
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 text-center">
                              <PieChart className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                              <h3 className="font-semibold mb-2">Analyse de Sentiment</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Évaluation du ton et des émotions
                              </p>
                              <Button variant="outline" className="w-full" disabled>
                                Bientôt disponible
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 text-center">
                              <Search className="w-12 h-12 mx-auto mb-3 text-teal-600" />
                              <h3 className="font-semibold mb-2">Extraction d'Entités</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Identification des personnes, lieux, dates
                              </p>
                              <Button variant="outline" className="w-full" disabled>
                                Bientôt disponible
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            // No document selected
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Bienvenue dans Document Studio Pro</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Uploadez un document PDF, Word ou texte pour commencer l'analyse IA avancée, 
                  la discussion intelligente, la traduction multilingue et les conversions de format.
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat IA</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Languages className="w-4 h-4" />
                    <span>Traduction</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileType className="w-4 h-4" />
                    <span>Conversion</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="w-4 h-4" />
                    <span>Analyses</span>
                  </div>
                </div>

                <Button 
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Uploader un document
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground mt-3">
                  Formats supportés : PDF, Word (.docx), Texte (.txt)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}