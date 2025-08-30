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
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  MessageSquare, 
  Eye, 
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
  BarChart3,
  GraduationCap,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileImage,
  Globe
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

interface ConversionOperation {
  id: string;
  operation_type: string;
  status: string;
  progress?: number;
  result_filename?: string;
  error_message?: string;
}

interface AnalysisResult {
  type: 'financial' | 'academic' | 'legal' | 'sentiment';
  title: string;
  content: string;
  downloadUrl?: string;
}

const SUPPORTED_LANGUAGES = {
  'en': 'Anglais',
  'es': 'Espagnol', 
  'de': 'Allemand',
  'it': 'Italien',
  'pt': 'Portugais',
  'zh': 'Chinois',
  'ar': 'Arabe',
  'ja': 'Japonais',
  'ru': 'Russe'
};

export default function DocumentStudio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Data state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [operations, setOperations] = useState<ConversionOperation[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [chatInput, setChatInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [conversionFormat, setConversionFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [analyzingDocument, setAnalyzingDocument] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [conversionProgress, setConversionProgress] = useState(0);

  // Load data on mount
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      
      if (data && data.length > 0 && !selectedDocument) {
        setSelectedDocument(data[0]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive"
      });
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
        content: `Bonjour ! Je peux vous aider à analyser ce document et répondre à toutes vos questions sur son contenu. ${selectedDocument?.ai_summary ? 'Le document a déjà été analysé par l\'IA.' : 'Commencez par poser une question ou demandez une analyse.'}`,
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

    // Validate file type - more permissive for Word files
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', // .doc files
      'text/plain'
    ];
    
    const fileName = file.name.toLowerCase();
    const isWordFile = fileName.endsWith('.docx') || fileName.endsWith('.doc');
    const isPdfFile = fileName.endsWith('.pdf');
    const isTxtFile = fileName.endsWith('.txt');
    
    if (!allowedTypes.includes(file.type) && !isWordFile && !isPdfFile && !isTxtFile) {
      toast({
        title: "Type de fichier non supporté",
        description: "Seuls les fichiers PDF (.pdf), Word (.docx, .doc) et texte (.txt) sont acceptés",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Create FormData and send to document-upload edge function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const { data: documentData, error: documentError } = await supabase.functions.invoke('document-upload', {
        body: formData
      });

      if (documentError) throw documentError;

      toast({
        title: "Document téléversé",
        description: `${file.name} a été téléversé et l'extraction a commencé`,
      });

      // Reload documents and select the new one
      await loadDocuments();
      if (documentData.document) {
        setSelectedDocument(documentData.document);
        setActiveTab('preview');
      }

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erreur de téléversement",
        description: "Impossible de téléverser le document",
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
      // Use the improved file-analyze function with advanced extraction
      const { data, error } = await supabase.functions.invoke('file-analyze', {
        body: { documentId }
      });

      if (error) throw error;

      // Update document state with analysis results
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              extracted_text: data.extracted_text,
              analysis_status: data.analysis_status || 'ai_completed',
              ai_summary: data.analysis?.summary,
              key_points: data.analysis?.keyPoints,
              document_type: data.analysis?.documentType,
              is_financial: data.analysis?.isFinancial,
              structure_info: data.analysis?.structure
            }
          : doc
      ));

      // Update selected document if it's the one being analyzed
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(prev => prev ? {
          ...prev,
          extracted_text: data.extracted_text,
          analysis_status: data.analysis_status || 'ai_completed',
          ai_summary: data.analysis?.summary,
          key_points: data.analysis?.keyPoints,
          document_type: data.analysis?.documentType,
          is_financial: data.analysis?.isFinancial,
          structure_info: data.analysis?.structure
        } : null);
      }

      toast({
        title: "Analyse terminée",
        description: data.message || "Document analysé avec succès",
      });

    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser le document",
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
      // Use the existing document-chat edge function
      const { data, error } = await supabase.functions.invoke('document-chat', {
        body: {
          documentId: selectedDocument.id,
          question: userMessage.content
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer || 'Désolé, je n\'ai pas pu traiter votre demande.',
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
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
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
    if (!selectedDocument) return;

    setTranslating(true);
    setTranslationProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setTranslationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('document-translate', {
        body: {
          documentId: selectedDocument.id,
          targetLanguage: selectedLanguage
        }
      });

      clearInterval(progressInterval);
      setTranslationProgress(100);

      if (error) throw error;

      toast({
        title: "Traduction terminée",
        description: `Document traduit en ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]}`,
      });

      // Download the translated document
      if (data.storage_path) {
        const { data: fileData } = await supabase.storage
          .from('documents')
          .download(data.storage_path);

        if (fileData) {
          const url = URL.createObjectURL(fileData);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename || `${selectedDocument.original_filename}_${selectedLanguage}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

    } catch (error) {
      console.error('Error translating document:', error);
      toast({
        title: "Erreur de traduction",
        description: "Impossible de traduire le document",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
      setTranslationProgress(0);
    }
  };

  const convertDocument = async () => {
    if (!selectedDocument) return;

    setConverting(true);
    setConversionProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      // Use document generation service for conversion
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en conversion de documents. Convertis le contenu fourni dans le format demandé en préservant la structure et la mise en forme.'
            },
            {
              role: 'user',
              content: `Convertis ce document en format ${conversionFormat.toUpperCase()}:\n\n${selectedDocument.extracted_text || selectedDocument.preview_text}`
            }
          ],
          model: 'gpt-4o-mini'
        }
      });

      clearInterval(progressInterval);
      setConversionProgress(100);

      if (error) throw error;

      // Create downloadable file
      const convertedContent = data.generatedText || data.message;
      const blob = new Blob([convertedContent], { 
        type: conversionFormat === 'pdf' ? 'application/pdf' : 
              conversionFormat === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
              'text/plain' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDocument.original_filename.split('.')[0]}_converted.${conversionFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Conversion terminée",
        description: `Document converti en ${conversionFormat.toUpperCase()}`,
      });

    } catch (error) {
      console.error('Error converting document:', error);
      toast({
        title: "Erreur de conversion",
        description: "Impossible de convertir le document",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
      setConversionProgress(0);
    }
  };

  const performAnalysis = async (analysisType: 'financial' | 'academic' | 'legal' | 'sentiment') => {
    if (!selectedDocument) return;

    setAnalyzingDocument(true);
    try {
      const analysisPrompts = {
        financial: `Effectue une analyse financière complète de ce document. Identifie les ratios financiers, tendances, points forts et faibles, et fournis des recommandations d'investissement ou de gestion.`,
        academic: `Effectue une analyse académique de ce document. Évalue la méthodologie, la qualité des sources, la structure argumentative, et fournis une critique constructive selon les standards académiques.`,
        legal: `Effectue une analyse juridique de ce document. Identifie les clauses importantes, les risques légaux, les obligations contractuelles et fournis des recommandations juridiques.`,
        sentiment: `Effectue une analyse de sentiment de ce document. Identifie le ton général, les émotions exprimées, les opinions positives/négatives et fournis un rapport détaillé sur l'attitude de l'auteur.`
      };

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en analyse ${analysisType}. Fournis une analyse détaillée et professionnelle en format Markdown avec des sections claires.`
            },
            {
              role: 'user',
              content: `${analysisPrompts[analysisType]}\n\nDocument à analyser:\n\n${selectedDocument.extracted_text || selectedDocument.preview_text}`
            }
          ],
          model: 'gpt-4o'
        }
      });

      if (error) throw error;

      const analysisContent = data.generatedText || data.message;
      const newAnalysis: AnalysisResult = {
        type: analysisType,
        title: `Analyse ${analysisType} - ${selectedDocument.original_filename}`,
        content: analysisContent
      };

      setAnalysisResults(prev => [...prev, newAnalysis]);

      toast({
        title: "Analyse terminée",
        description: `Analyse ${analysisType} effectuée avec succès`,
      });

      // Switch to analysis tab
      setActiveTab('analysis');

    } catch (error) {
      console.error('Error performing analysis:', error);
      toast({
        title: "Erreur d'analyse",
        description: `Impossible d'effectuer l'analyse ${analysisType}`,
        variant: "destructive",
      });
    } finally {
      setAnalyzingDocument(false);
    }
  };

  const downloadAnalysis = (analysis: AnalysisResult) => {
    const blob = new Blob([analysis.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📁';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ai_completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ai_processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Document Studio Pro</h1>
              <p className="text-sm text-muted-foreground">Analysez, traduisez et convertissez vos documents avec l'IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:flex">
              {documents.length} document{documents.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* Left Panel - Document List */}
        <div className={`${selectedDocument ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 border-r bg-card flex-col`}>
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
                className="w-full" 
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Téléversement...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un document
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

          {/* Document List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileX className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">
                    {searchTerm ? 'Aucun document trouvé' : 'Aucun document'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDocument?.id === doc.id 
                          ? 'bg-primary/10 border-primary/20 border' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileIcon(doc.file_type)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm">{doc.original_filename}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                                </p>
                                {getStatusIcon(doc.analysis_status)}
                                {doc.ai_summary && (
                                  <Badge variant="secondary" className="text-xs">IA</Badge>
                                )}
                              </div>
                            </div>
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
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Document Viewer & Tools */}
        <div className={`${selectedDocument ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
          {selectedDocument ? (
            <>
              {/* Document Header */}
              <div className="border-b bg-card p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedDocument(null)}
                      className="lg:hidden flex-shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-lg">{getFileIcon(selectedDocument.file_type)}</span>
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate">{selectedDocument.original_filename}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(selectedDocument.file_size / 1024 / 1024).toFixed(1)} MB</span>
                        <span>•</span>
                        <span>{new Date(selectedDocument.created_at).toLocaleDateString('fr-FR')}</span>
                        {getStatusIcon(selectedDocument.analysis_status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedDocument.analysis_status === 'ai_completed' ? "outline" : "default"}
                      size="sm"
                      onClick={() => analyzeDocument(selectedDocument.id)}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyse avancée...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          {selectedDocument.analysis_status === 'ai_completed' ? 'Analyser à nouveau' : 'Analyser avec IA'}
                        </>
                      )}
                    </Button>
                    
                    {selectedDocument.structure_info?.extractionQuality && (
                      <Badge variant={
                        selectedDocument.structure_info.extractionQuality.includes('good') ? 'default' :
                        selectedDocument.structure_info.extractionQuality.includes('partial') ? 'secondary' : 'outline'
                      }>
                        {selectedDocument.structure_info.extractionQuality.includes('good') ? '✅ Extraction complète' :
                         selectedDocument.structure_info.extractionQuality.includes('partial') ? '⚠️ Extraction partielle' : '❌ Extraction limitée'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b bg-card px-4">
                  <TabsList className="grid w-full grid-cols-6">
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
                    <TabsTrigger value="analysis" className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      <span className="hidden sm:inline">Analyses</span>
                    </TabsTrigger>
                    <TabsTrigger value="tools" className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span className="hidden sm:inline">Outils</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="preview" className="h-full m-0">
                    <DocumentContentViewer 
                      document={selectedDocument} 
                      isAnalyzing={analyzing}
                    />
                  </TabsContent>

                  <TabsContent value="chat" className="h-full m-0">
                    <div className="flex flex-col h-full">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4 max-w-4xl mx-auto">
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
                                  <div className={`text-xs mt-2 opacity-70`}>
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
                      <div className="border-t p-4 bg-card">
                        <div className="flex gap-2 max-w-4xl mx-auto">
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
                            size="sm"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="translate" className="h-full m-0">
                    <div className="p-6 max-w-4xl mx-auto">
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
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Langue cible</label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
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

                          {translating && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Traduction en cours...</span>
                                <span>{translationProgress}%</span>
                              </div>
                              <Progress value={translationProgress} />
                            </div>
                          )}

                          <Button 
                            onClick={translateDocument}
                            disabled={translating}
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
                                Traduire en {SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]}
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="convert" className="h-full m-0">
                    <div className="p-6 max-w-4xl mx-auto">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileType className="w-5 h-5" />
                            Conversion de format
                          </CardTitle>
                          <CardDescription>
                            Convertissez votre document vers un autre format
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Format de sortie</label>
                            <Select value={conversionFormat} onValueChange={(value: any) => setConversionFormat(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="docx">Word (DOCX)</SelectItem>
                                <SelectItem value="txt">Texte simple</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {converting && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Conversion en cours...</span>
                                <span>{conversionProgress}%</span>
                              </div>
                              <Progress value={conversionProgress} />
                            </div>
                          )}

                          <Button 
                            onClick={convertDocument}
                            disabled={converting}
                            className="w-full"
                          >
                            {converting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Conversion en cours...
                              </>
                            ) : (
                              <>
                                <FileType className="w-4 h-4 mr-2" />
                                Convertir en {conversionFormat.toUpperCase()}
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="analysis" className="h-full m-0">
                    <div className="p-6 max-w-4xl mx-auto space-y-6">
                      {/* Analysis Tools */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => performAnalysis('financial')}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                <BarChart3 className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Analyse Financière</h3>
                                <p className="text-sm text-muted-foreground">Ratios, tendances, recommandations</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => performAnalysis('academic')}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                <GraduationCap className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Analyse Académique</h3>
                                <p className="text-sm text-muted-foreground">Méthodologie, sources, qualité</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => performAnalysis('legal')}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Analyse Juridique</h3>
                                <p className="text-sm text-muted-foreground">Clauses, risques, obligations</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => performAnalysis('sentiment')}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                                <MessageSquare className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Analyse de Sentiment</h3>
                                <p className="text-sm text-muted-foreground">Ton, émotions, opinions</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Analysis Results */}
                      {analysisResults.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Résultats d'analyse</h3>
                          {analysisResults.map((result, index) => (
                            <Card key={index}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">{result.title}</CardTitle>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadAnalysis(result)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Télécharger
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="prose prose-sm max-w-none">
                                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }} />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {analyzingDocument && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Analyse en cours...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tools" className="h-full m-0">
                    <div className="p-6 max-w-4xl mx-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PDF Viewer */}
                        {selectedDocument.file_type === 'pdf' && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <FileImage className="w-5 h-5" />
                                Aperçu PDF
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="aspect-[3/4] border rounded-lg overflow-hidden bg-muted">
                                <iframe
                                  src={`${supabase.storage.from('documents').getPublicUrl(selectedDocument.storage_path).data.publicUrl}#toolbar=0`}
                                  className="w-full h-full"
                                  title="PDF Preview"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Document Info */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Informations du document
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Nom :</span>
                                <p className="text-muted-foreground">{selectedDocument.original_filename}</p>
                              </div>
                              <div>
                                <span className="font-medium">Type :</span>
                                <p className="text-muted-foreground">{selectedDocument.file_type.toUpperCase()}</p>
                              </div>
                              <div>
                                <span className="font-medium">Taille :</span>
                                <p className="text-muted-foreground">{(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <div>
                                <span className="font-medium">Créé :</span>
                                <p className="text-muted-foreground">{new Date(selectedDocument.created_at).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>

                            {selectedDocument.ai_summary && (
                              <div className="pt-3 border-t">
                                <span className="font-medium">Résumé IA :</span>
                                <p className="text-sm text-muted-foreground mt-1">{selectedDocument.ai_summary}</p>
                              </div>
                            )}

                            {selectedDocument.key_points && selectedDocument.key_points.length > 0 && (
                              <div className="pt-3 border-t">
                                <span className="font-medium">Points clés :</span>
                                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                  {selectedDocument.key_points.slice(0, 3).map((point, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            // No document selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sélectionnez un document</h3>
                <p className="text-muted-foreground mb-4">
                  Téléversez un document PDF, Word ou texte pour commencer l'analyse
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un document
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}