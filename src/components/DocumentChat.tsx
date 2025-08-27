import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Bot, User, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface DocumentChatProps {
  file: UploadedFile;
  onBack: () => void;
}

export default function DocumentChat({ file, onBack }: DocumentChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load chat history for this file
    const savedChats = localStorage.getItem(`document_chat_${file.id}`);
    if (savedChats) {
      setMessages(JSON.parse(savedChats));
    } else {
      // Initialize with welcome message
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Bonjour ! Je suis votre assistant IA pour le document "${file.name}". ${file.analysis ? 'J\'ai déjà analysé ce document et je peux répondre à vos questions sur son contenu.' : 'Analysez d\'abord le document pour que je puisse vous aider avec son contenu.'}\n\nQue souhaitez-vous savoir ?`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [file.id, file.name, file.analysis]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveMessages = (newMessages: ChatMessage[]) => {
    localStorage.setItem(`document_chat_${file.id}`, JSON.stringify(newMessages));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Prepare context for AI
      const context = file.analysis 
        ? `Contexte du document "${file.name}":\n${file.analysis}\n\nQuestion de l'utilisateur:`
        : `L'utilisateur pose une question sur le document "${file.name}" mais le document n'a pas encore été analysé. Demandez-lui d'analyser d'abord le document.`;

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Vous êtes un assistant IA spécialisé dans l\'analyse de documents. Répondez de manière précise et utile en vous basant sur le contenu du document fourni. Si le document n\'a pas été analysé, demandez à l\'utilisateur de l\'analyser d\'abord.'
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
      setMessages(finalMessages);
      saveMessages(finalMessages);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Bonjour ! Je suis votre assistant IA pour le document "${file.name}". ${file.analysis ? 'J\'ai déjà analysé ce document et je peux répondre à vos questions sur son contenu.' : 'Analysez d\'abord le document pour que je puisse vous aider avec son contenu.'}\n\nQue souhaitez-vous savoir ?`,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
    saveMessages([welcomeMessage]);
  };

  const getFileTypeIcon = () => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    return '📁';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-2xl">{getFileTypeIcon()}</span>
                Chat - {file.name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">
                  Discutez avec l'IA sur le contenu de votre document
                </p>
                {file.analysis && (
                  <Badge variant="default" className="bg-green-500">
                    Document analysé
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={clearChat} size="sm">
            Nouveau chat
          </Button>
        </div>

        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Assistant IA - Document
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      
                      <div className={`px-4 py-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                        <div className={`text-xs mt-2 opacity-70 ${
                          message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-muted px-4 py-3 rounded-lg">
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

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder={file.analysis ? "Posez votre question sur le document..." : "Analysez d'abord le document pour commencer..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!input.trim() || loading}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {!file.analysis && (
                <div className="mt-2 text-xs text-muted-foreground">
                  💡 Conseil: Analysez d'abord le document depuis l'aperçu pour pouvoir poser des questions spécifiques sur son contenu.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}