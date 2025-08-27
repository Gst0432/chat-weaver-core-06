import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  FileX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentGeneratorService } from '@/services/documentGeneratorService';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Fonction pour rendre le markdown simple
const renderMarkdown = (text: string) => {
  return text
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mb-2 mt-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mb-2 mt-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-2 mt-3">$1</h1>')
    // Gras
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italique
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Listes
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
    // Code inline
    .replace(/`([^`]+)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Sauts de ligne
    .replace(/\n/g, '<br/>');
};

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Documents() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Data state
  const [documents, setDocuments] = useState<DocumentGeneration[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'chat'>('preview');
  const [chatInput, setChatInput] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [converting, setConverting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (rightPanelTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, rightPanelTab]);

  // Load chat when file changes
  useEffect(() => {
    if (selectedFile) {
      loadChatHistory(selectedFile.id);
    } else {
      setChatMessages([]);
    }
  }, [selectedFile?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const savedFiles = localStorage.getItem('uploaded_files');
      if (savedFiles) {
        const files = JSON.parse(savedFiles);
        setUploadedFiles(files);
        if (files.length > 0 && !selectedFile) {
          setSelectedFile(files[0]);
        }
      }
      
      const savedDocs = localStorage.getItem('document_generations');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = (fileId: string) => {
    const savedChat = localStorage.getItem(`document_chat_${fileId}`);
    if (savedChat) {
      setChatMessages(JSON.parse(savedChat));
    } else {
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Bonjour ! Je peux vous aider à analyser ce document et répondre à toutes vos questions sur son contenu. ${selectedFile?.analysis ? 'Le document a déjà été analysé.' : 'Vous pouvez commencer à poser des questions directement.'}`,
        timestamp: new Date().toISOString()
      };
      setChatMessages([welcomeMessage]);
    }
  };

  const saveChatHistory = (messages: ChatMessage[]) => {
    if (selectedFile) {
      localStorage.setItem(`document_chat_${selectedFile.id}`, JSON.stringify(messages));
    }
  };

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
      localStorage.setItem('uploaded_files', JSON.stringify(updatedFiles));
      setSelectedFile(newFile);

      toast({
        title: "Fichier uploadé",
        description: `${file.name} a été uploadé avec succès`,
      });
    };
    reader.readAsDataURL(file);
  };

  const analyzeDocument = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('file-analyze', {
        body: {
          fileBase64: file.content,
          fileName: file.name,
          mime: file.type,
          prompt: 'Analyse ce document et fournis un résumé détaillé de son contenu.'
        }
      });

      if (error) throw error;

      const result = data.generatedText;
      
      // Update file with analysis
      const updatedFiles = uploadedFiles.map(f => 
        f.id === fileId ? { ...f, analysis: result } : f
      );
      setUploadedFiles(updatedFiles);
      localStorage.setItem('uploaded_files', JSON.stringify(updatedFiles));
      
      // Update selected file if it's the current one
      if (selectedFile?.id === fileId) {
        setSelectedFile({ ...selectedFile, analysis: result });
      }

      toast({
        title: "Analyse terminée",
        description: "Document analysé avec succès",
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

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedFile || chatLoading) return;

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
      // Préparer le contexte complet du document pour le chat
      let context = `Document: "${selectedFile.name}"\n\n`;
      
      if (selectedFile.analysis) {
        context += `Analyse: ${selectedFile.analysis}\n\n`;
      }
      
      // Décoder le contenu base64 pour l'inclure dans le contexte
      try {
        const decodedContent = atob(selectedFile.content);
        // Limiter le contenu à 8000 caractères pour éviter de dépasser les limites
        const truncatedContent = decodedContent.length > 8000 
          ? decodedContent.substring(0, 8000) + "...\n[Contenu tronqué]"
          : decodedContent;
        context += `Contenu du document:\n${truncatedContent}\n\n`;
      } catch (error) {
        console.error('Error decoding document content:', error);
      }
      
      context += `Question:`;

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Vous êtes un assistant IA spécialisé dans l\'analyse de documents. Répondez de manière précise et utile.'
            },
            {
              role: 'user',
              content: `${context}\n${userMessage.content}`
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 1000
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'Désolé, je n\'ai pas pu traiter votre demande.',
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

  const deleteFile = (id: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updatedFiles);
    localStorage.setItem('uploaded_files', JSON.stringify(updatedFiles));
    
    if (selectedFile?.id === id) {
      setSelectedFile(updatedFiles[0] || null);
    }
    
    toast({
      title: "Fichier supprimé",
      description: "Le fichier a été supprimé avec succès",
    });
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = `data:${file.type};base64,${file.content}`;
    link.download = file.name;
    link.click();
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📁';
  };

  const filteredFiles = uploadedFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-xl md:text-2xl font-bold">Documents</h1>
              <p className="text-sm text-muted-foreground">Analysez et discutez avec vos documents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)]">
        {/* Left Panel - Document List */}
        <div className={`${selectedFile ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r md:border-b-0 border-b bg-card flex-col`}>
          {/* Upload Section */}
          <div className="p-4 border-b">
            <label className="block">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button className="w-full" variant="default">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un document
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

          {/* File List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileX className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Aucun document</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFile?.id === file.id 
                          ? 'bg-primary/10 border-primary/20 border' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileIcon(file.type)}</span>
                            <p className="font-medium truncate text-sm">{file.name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                            {file.analysis && (
                              <Badge variant="secondary" className="text-xs">Analysé</Badge>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => downloadFile(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteFile(file.id)}
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

        {/* Right Panel - Preview & Chat */}
        <div className={`${selectedFile ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedFile ? (
            <>
              {/* Tab Header */}
              <div className="border-b bg-card">
                  <div className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedFile(null)}
                          className="md:hidden flex-shrink-0"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-lg">{getFileIcon(selectedFile.type)}</span>
                        <div className="min-w-0">
                          <h2 className="font-semibold truncate">{selectedFile.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedFile.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={selectedFile.analysis ? "secondary" : "default"}
                          size="sm"
                          onClick={() => analyzeDocument(selectedFile.id)}
                          disabled={analyzing}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {analyzing ? 'Analyse...' : selectedFile.analysis ? 'Re-analyser' : 'Analyser'}
                        </Button>
                      </div>
                    </div>
                  
                  <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'preview' | 'chat')} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Aperçu
                      </TabsTrigger>
                      <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Chat IA
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1">
                {rightPanelTab === 'preview' ? (
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      {selectedFile.analysis ? (
                        <div className="prose prose-sm max-w-none">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            Analyse du document
                          </h3>
                          <div className="bg-secondary/20 p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                              {selectedFile.analysis}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-center">
                          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Document non analysé</h3>
                          <p className="text-muted-foreground mb-4 max-w-md">
                            Analysez ce document pour voir son contenu et pouvoir discuter avec l'IA
                          </p>
                          <Button onClick={() => analyzeDocument(selectedFile.id)} disabled={analyzing}>
                            <Eye className="w-4 h-4 mr-2" />
                            {analyzing ? 'Analyse en cours...' : 'Analyser maintenant'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  // Chat Interface
                  <div className="flex flex-col h-full">
                    <ScrollArea className="flex-1 p-4">
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
                )}
              </div>
            </>
          ) : (
            // No file selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sélectionnez un document</h3>
                <p className="text-muted-foreground mb-4">
                  Uploadez un document pour commencer l'analyse et la discussion
                </p>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un document
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