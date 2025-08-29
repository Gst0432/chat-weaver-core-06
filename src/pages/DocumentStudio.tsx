import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { renderMarkdown } from '@/lib/markdown';
import DocumentContentViewer from '@/components/DocumentContentViewer';

interface Document {
  id: string;
  original_filename: string;
  file_type: 'pdf' | 'docx' | 'txt';
  file_size: number;
  storage_path: string;
  extracted_text?: string;
  preview_text?: string;
  analysis_status?: string;
  processed_at?: string;
  filename?: string;
  created_at: string;
}

interface Operation {
  id: string;
  operation_type: 'conversion' | 'translation' | 'summary' | 'chat';
  operation_params: any;
  result_storage_path?: string;
  result_filename?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}


// Helper function to clean and validate preview text
const cleanPreviewText = (text: string): { isValid: boolean; cleanedText: string; errorMessage?: string } => {
  if (!text) return { isValid: false, cleanedText: '', errorMessage: 'Aucun contenu disponible' };
  
  // Clean the text by removing control characters and binary data
  let cleaned = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\uFFFD/g, '') // Remove replacement characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Additional cleanup for binary characters
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep only printable characters
    .trim();
  
  // Check if we have readable text (at least some letters and reasonable length)
  const hasLetters = /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(cleaned);
  const readableChars = cleaned.match(/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s.,!?;:()\-"']/g);
  const readablePercentage = readableChars ? (readableChars.length / cleaned.length) : 0;
  
  // If the text is mostly binary/corrupted or doesn't contain letters
  if (!hasLetters || readablePercentage < 0.3 || cleaned.length < 10) {
    return {
      isValid: false,
      cleanedText: '',
      errorMessage: 'Le contenu du document semble être corrompu ou composé principalement de données binaires'
    };
  }
  
  // Format the text nicely
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2') // Add paragraphs after sentences
    .trim();
  
  return { isValid: true, cleanedText: cleaned };
};

export default function DocumentStudio() {
  const { toast } = useToast();
  
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'chat' | 'operations'>('content');
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as Document[]);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load operations for selected document
  const loadOperations = useCallback(async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_operations')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOperations((data || []) as Operation[]);
    } catch (error) {
      console.error('Error loading operations:', error);
    }
  }, []);

  // Load chat history
  const loadChatHistory = useCallback(async (documentId: string) => {
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
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (selectedDocument) {
      loadOperations(selectedDocument.id);
      loadChatHistory(selectedDocument.id);
    }
  }, [selectedDocument, loadOperations, loadChatHistory]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

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
      setSelectedDocument(data.document);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message || "Impossible d'uploader le fichier",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Enhanced document analysis with intelligent feedback 
  const analyzeDocument = async (documentId: string) => {
    setIsVectorizing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      console.log(`Starting analysis for document: ${documentId}`);

      // First analyze the file to extract proper text content
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('file-analyze', {
        body: { documentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (analyzeError) throw analyzeError;

      console.log('Analysis result:', analyzeData);

      // Reload documents to show updated preview
      await loadDocuments();
      
      // Update selected document if it's the one we analyzed
      if (selectedDocument?.id === documentId) {
        const updatedDoc = documents.find(doc => doc.id === documentId);
        if (updatedDoc) {
          setSelectedDocument(updatedDoc);
        }
      }

      // Enhanced quality-based feedback
      const getQualityMessage = (quality: string, length: number, wordCount: number) => {
        const qualityMessages = {
          excellent: `✨ Analyse excellente ! ${length.toLocaleString()} caractères et ${wordCount.toLocaleString()} mots extraits`,
          good: `✅ Bonne extraction ! ${length.toLocaleString()} caractères et ${wordCount.toLocaleString()} mots récupérés`,
          moderate: `⚠️ Extraction modérée (${length.toLocaleString()} caractères). Le chat IA peut analyser davantage`,
          basic: `🔍 Extraction basique (${length.toLocaleString()} caractères). Essayez la conversion en texte`,
          poor: `❌ Extraction limitée. Document peut-être scanné ou protégé`
        };
        return qualityMessages[quality] || 'Document analysé';
      };

      const qualityTips = {
        excellent: null,
        good: null,
        moderate: 'Pour une meilleure extraction, essayez de convertir le document en format texte',
        basic: 'Le document pourrait être scanné ou utiliser des polices complexes',
        poor: 'Essayez de convertir en PDF texte ou utilisez un OCR externe'
      };

      const message = getQualityMessage(analyzeData?.quality, analyzeData?.length || 0, analyzeData?.wordCount || 0);
      const tip = qualityTips[analyzeData?.quality];

      // Then vectorize the document for AI chat
      const { data: vectorizeData, error: vectorizeError } = await supabase.functions.invoke('document-vectorize', {
        body: { documentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (vectorizeError) throw vectorizeError;

      // Show success toast with quality info
      toast({
        title: "Analyse et vectorisation terminées",
        description: message,
      });

      // Show additional tip if needed
      if (tip) {
        setTimeout(() => {
          toast({
            title: "💡 Conseil",
            description: tip,
            variant: "default",
          });
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Erreur d'analyse",
        description: error.message || "Impossible d'analyser le document",
        variant: "destructive",
      });
    } finally {
      setIsVectorizing(false);
    }
  };

  // Vectorize document
  const vectorizeDocument = async (documentId: string) => {
    setIsVectorizing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('document-vectorize', {
        body: { documentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Vectorisation terminée",
        description: `${data.chunks_processed} sections ont été vectorisées`,
      });
      
    } catch (error) {
      console.error('Error vectorizing document:', error);
      toast({
        title: "Erreur de vectorisation",
        description: error.message || "Impossible de vectoriser le document",
        variant: "destructive",
      });
    } finally {
      setIsVectorizing(false);
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedDocument || chatLoading) return;

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
          documentId: selectedDocument.id,
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
        content: 'Désolé, une erreur est survenue. Assurez-vous que le document a été vectorisé.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Start translation
  const startTranslation = async (targetLanguage: string) => {
    if (!selectedDocument) return;
    
    setProcessing('translation');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('document-translate', {
        body: {
          documentId: selectedDocument.id,
          targetLanguage
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Traduction lancée",
        description: `La traduction en ${targetLanguage} a été lancée`,
      });

      await loadOperations(selectedDocument.id);
      
    } catch (error) {
      console.error('Error starting translation:', error);
      toast({
        title: "Erreur de traduction",
        description: error.message || "Impossible de lancer la traduction",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  // Start summarization
  const startSummarization = async (summaryType: string, style: string) => {
    if (!selectedDocument) return;
    
    setProcessing('summary');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('document-summarize', {
        body: {
          documentId: selectedDocument.id,
          summaryType,
          style
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Résumé lancé",
        description: `Le résumé ${summaryType} en style ${style} a été lancé`,
      });

      await loadOperations(selectedDocument.id);
      
    } catch (error) {
      console.error('Error starting summarization:', error);
      toast({
        title: "Erreur de résumé",
        description: error.message || "Impossible de lancer le résumé",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  // Download file
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

  // Helper functions
  const renderFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'txt':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'translation': return <Languages className="w-4 h-4" />;
      case 'summary': return <Sparkles className="w-4 h-4" />;
      case 'conversion': return <FileType className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Loader2 className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Document Studio</h1>
              <p className="text-sm text-muted-foreground">Analysez, discutez, traduisez et résumez vos documents avec l'IA</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)]">
        {/* Left Panel - Document List */}
        <div className={`${selectedDocument ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r bg-card flex-col`}>
          {/* Upload Section */}
          <div className="p-4 border-b">
            <label className="block">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button className="w-full" disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Upload en cours...' : 'Uploader un document'}
              </Button>
            </label>
          </div>

          {/* Documents List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Aucun document</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {documents.map((doc) => (
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
                            <span className="text-lg">{renderFileIcon(doc.file_type)}</span>
                            <p className="font-medium truncate text-sm">{doc.original_filename}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                            </p>
                            <Badge variant="secondary" className="text-xs">{doc.file_type.toUpperCase()}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Document Actions */}
        <div className={`${selectedDocument ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
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
                      className="md:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-lg">{renderFileIcon(selectedDocument.file_type)}</span>
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate">{selectedDocument.original_filename}</h2>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedDocument.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeDocument(selectedDocument.id)}
                      disabled={isVectorizing}
                    >
                      {isVectorizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                      {isVectorizing ? 'Analyse...' : 'Analyser'}
                    </Button>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4 flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Aperçu
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Chat IA
                    </TabsTrigger>
                    <TabsTrigger value="operations" className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Opérations
                    </TabsTrigger>
                  </TabsList>
                
                  {/* Tab Content */}
                  <div className="flex-1">
                    <TabsContent value="preview" className="h-full m-0">
                      <ScrollArea className="h-full">
                        <div className="p-6">
                          {(() => {
                            const cleanedPreview = selectedDocument.preview_text 
                              ? cleanPreviewText(selectedDocument.preview_text)
                              : { isValid: false, cleanedText: '', errorMessage: 'Aucun aperçu disponible' };
                            
                            return (
                              <div className="space-y-4">
                                {cleanedPreview.isValid && cleanedPreview.cleanedText ? (
                                  <div className="bg-muted/50 rounded-lg p-4 border">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-medium text-foreground">Aperçu du contenu</h4>
                                      {selectedDocument.extracted_text && (
                                        <div className="flex items-center gap-3 text-xs">
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <FileText className="h-3 w-3" />
                                            {selectedDocument.extracted_text.length.toLocaleString()} caractères
                                          </div>
                                          {selectedDocument.extracted_text.split(/\s+/).length > 0 && (
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                              <span>📝</span>
                                              {selectedDocument.extracted_text.split(/\s+/).filter(w => w.length > 0).length.toLocaleString()} mots
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="bg-background/50 rounded p-3 max-h-64 overflow-y-auto">
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                                        {cleanedPreview.cleanedText}
                                      </p>
                                    </div>
                                    {selectedDocument.extracted_text && selectedDocument.extracted_text.length > cleanedPreview.cleanedText.length && (
                                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                        ✨ Contenu complet disponible pour le chat IA ({selectedDocument.extracted_text.length.toLocaleString()} caractères total)
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-muted/30 rounded-lg p-6 border border-dashed text-center">
                                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-muted-foreground mb-1">
                                          Aucun aperçu textuel disponible
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Le contenu n'a pas encore été extrait ou analysé
                                        </p>
                                      </div>
                                      
                                      {cleanedPreview.errorMessage?.includes('corrompu') && (
                                        <div className="text-sm bg-warning/10 border border-warning/20 rounded-lg p-3 mt-3">
                                          <div className="flex items-center gap-2 text-warning-foreground mb-1">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="font-medium">Contenu corrompu détecté</span>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            Le fichier pourrait être protégé, scanné, ou contenir principalement des images
                                          </p>
                                        </div>
                                      )}
                                      
                                      {!isVectorizing ? (
                                        <div className="space-y-2">
                                          <Button
                                            onClick={() => analyzeDocument(selectedDocument.id)}
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                          >
                                            <Search className="h-4 w-4" />
                                            Extraire le contenu
                                          </Button>
                                          <p className="text-xs text-muted-foreground">
                                            🚀 Analyse intelligente pour PDF, DOCX et fichiers texte
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                            Extraction en cours...
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            🔍 Analyse du document et extraction intelligente du texte
                                          </p>
                                        </div>
                                      )}
                                      
                                      <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                        💡 Même sans aperçu, le chat IA peut analyser directement le document
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Additional actions */}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => analyzeDocument(selectedDocument.id)}
                                    disabled={isVectorizing}
                                    size="sm"
                                    variant={cleanedPreview.isValid ? "outline" : "default"}
                                    className="gap-2"
                                  >
                                    {isVectorizing ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Analyse...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-4 h-4" />
                                        {cleanedPreview.isValid ? 'Ré-analyser' : 'Préparer pour le chat IA'}
                                      </>
                                    )}
                                  </Button>
                                  
                                  {cleanedPreview.isValid && (
                                    <Button
                                      onClick={() => setActiveTab('chat')}
                                      size="sm"
                                      variant="outline"
                                      className="gap-2"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                      Discuter du document
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="chat" className="h-full m-0">
                      <div className="flex flex-col h-full">
                        <ScrollArea className="flex-1 p-4">
                          <div className="space-y-4">
                            {chatMessages.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Bot className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Posez une question sur ce document</p>
                                <p className="text-xs mt-1">Assurez-vous d'avoir vectorisé le document au préalable</p>
                              </div>
                            ) : (
                              chatMessages.map((message) => (
                                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                          </div>
                        </ScrollArea>

                        {/* Chat Input */}
                        <div className="border-t p-4">
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
                              size="sm"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="operations" className="h-full m-0">
                      <ScrollArea className="h-full">
                        <div className="p-6">
                          {/* Quick Actions */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Languages className="w-5 h-5" />
                                  Traduction
                                </CardTitle>
                                <CardDescription>Traduire le document dans une autre langue</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <Select onValueChange={startTranslation} disabled={processing === 'translation'}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choisir une langue" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="anglais">Anglais</SelectItem>
                                    <SelectItem value="espagnol">Espagnol</SelectItem>
                                    <SelectItem value="italien">Italien</SelectItem>
                                    <SelectItem value="allemand">Allemand</SelectItem>
                                    <SelectItem value="chinois">Chinois</SelectItem>
                                    <SelectItem value="arabe">Arabe</SelectItem>
                                  </SelectContent>
                                </Select>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Sparkles className="w-5 h-5" />
                                  Résumé
                                </CardTitle>
                                <CardDescription>Créer un résumé du document</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => startSummarization('detailed', 'simple')}
                                    disabled={processing === 'summary'}
                                  >
                                    Détaillé
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => startSummarization('concise', 'simple')}
                                    disabled={processing === 'summary'}
                                  >
                                    Concis
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => startSummarization('detailed', 'academic')}
                                    disabled={processing === 'summary'}
                                  >
                                    Académique
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => startSummarization('detailed', 'storytelling')}
                                    disabled={processing === 'summary'}
                                  >
                                    Narratif
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => startSummarization('concise', 'simple')}
                                    disabled={processing === 'summary'}
                                  >
                                    Simple
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Operations History */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Historique des opérations</h3>
                            
                            {operations.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Sparkles className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Aucune opération effectuée</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {operations.map((operation) => (
                                  <Card key={operation.id}>
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          {getOperationIcon(operation.operation_type)}
                                          <div>
                                            <p className="font-medium capitalize">
                                              {operation.operation_type === 'translation' && 'Traduction'}
                                              {operation.operation_type === 'summary' && 'Résumé'}
                                              {operation.operation_type === 'conversion' && 'Conversion'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {new Date(operation.created_at).toLocaleString('fr-FR')}
                                            </p>
                                            {operation.operation_params?.target_language && (
                                              <Badge variant="secondary" className="text-xs mt-1">
                                                {operation.operation_params.target_language}
                                              </Badge>
                                            )}
                                            {operation.operation_params?.summary_type && (
                                              <Badge variant="secondary" className="text-xs mt-1 mr-1">
                                                {operation.operation_params.summary_type}
                                              </Badge>
                                            )}
                                            {operation.operation_params?.style && (
                                              <Badge variant="secondary" className="text-xs mt-1">
                                                {operation.operation_params.style}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(operation.status)}
                                          {operation.status === 'completed' && operation.result_storage_path && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => downloadFile(operation.result_storage_path!, operation.result_filename!)}
                                            >
                                              <Download className="w-4 h-4 mr-1" />
                                              Télécharger
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {operation.status === 'processing' && operation.operation_params?.progress && (
                                        <Progress value={operation.operation_params.progress} className="mt-2" />
                                      )}
                                      
                                      {operation.error_message && (
                                        <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                                          {operation.error_message}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          ) : (
            // No document selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Bienvenue dans Document Studio</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Uploadez un document PDF, Word ou texte pour commencer l'analyse, la discussion IA, la traduction et la création de résumés
                </p>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button disabled={uploading} asChild>
                    <span className="cursor-pointer">
                      {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      {uploading ? 'Upload en cours...' : 'Uploader un document'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}