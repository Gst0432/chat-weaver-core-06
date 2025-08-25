import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Code2, Wand2, Bug, Sparkles, Copy, CheckCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { aiService } from "@/services/aiService";

interface CodeStudioChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  model?: string;
  type?: 'code' | 'text';
}

interface CodeStudioChatProps {
  currentCode: {
    html: string;
    css: string;
    javascript: string;
  };
  activeTab: 'html' | 'css' | 'javascript';
  onInsertCode: (code: string, tab: 'html' | 'css' | 'javascript') => void;
  selectedModel: string;
}

export const CodeStudioChat = ({ currentCode, activeTab, onInsertCode, selectedModel }: CodeStudioChatProps) => {
  const [messages, setMessages] = useState<CodeStudioChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickCommands = [
    { icon: Code2, label: "Générer composant", command: "/generate " },
    { icon: Wand2, label: "Améliorer", command: "/improve " },
    { icon: Bug, label: "Débugger", command: "/fix " },
    { icon: Sparkles, label: "Responsive", command: "/responsive " },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: CodeStudioChatMessage = {
      id: Date.now().toString(),
      content: message,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      // Créer un prompt spécialisé pour le code
      const codeContext = `
Contexte du code actuel:
HTML: ${currentCode.html.slice(0, 1000)}${currentCode.html.length > 1000 ? '...' : ''}
CSS: ${currentCode.css.slice(0, 1000)}${currentCode.css.length > 1000 ? '...' : ''}
JavaScript: ${currentCode.javascript.slice(0, 1000)}${currentCode.javascript.length > 1000 ? '...' : ''}

Onglet actif: ${activeTab.toUpperCase()}
`;

      const specializedPrompt = `Tu es un assistant spécialisé dans le développement web. 
${codeContext}

Instructions:
- Si la demande commence par /generate, génère du code complet
- Si elle commence par /improve, améliore le code existant 
- Si elle commence par /fix, corrige les erreurs du code
- Si elle commence par /responsive, rends le code responsive
- Toujours retourner du code prêt à utiliser
- Sépare clairement HTML, CSS et JavaScript
- Utilise des commentaires pour expliquer le code

Demande utilisateur: ${message}`;

      const result = await aiService.generateIntelligent(specializedPrompt, selectedModel);
      const response = result.text;
      
      // Détecter si la réponse contient du code
      const hasCode = response.includes('```') || response.includes('<') || response.includes('{');
      
      const assistantMessage: CodeStudioChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel,
        type: hasCode ? 'code' : 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Erreur génération:", error);
      const errorMessage: CodeStudioChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Erreur: ${error instanceof Error ? error.message : "Échec de la génération"}`,
        role: "assistant",
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractCode = (content: string, language: 'html' | 'css' | 'javascript' | 'js') => {
    const patterns = {
      html: /```html\n([\s\S]*?)\n```/g,
      css: /```css\n([\s\S]*?)\n```/g,
      javascript: /```(?:javascript|js)\n([\s\S]*?)\n```/g,
      js: /```(?:javascript|js)\n([\s\S]*?)\n```/g
    };
    
    const matches = [...content.matchAll(patterns[language])];
    return matches.map(match => match[1]).join('\n');
  };

  const handleInsertCode = (content: string, targetTab?: 'html' | 'css' | 'javascript') => {
    const tab = targetTab || activeTab;
    let codeToInsert = '';

    // Extraire le code approprié selon l'onglet
    if (tab === 'html') {
      codeToInsert = extractCode(content, 'html');
      if (!codeToInsert && content.includes('<')) {
        // Si pas de blocs de code mais contient du HTML
        codeToInsert = content.replace(/```[\s\S]*?```/g, '').trim();
      }
    } else if (tab === 'css') {
      codeToInsert = extractCode(content, 'css');
      if (!codeToInsert && content.includes('{')) {
        codeToInsert = content.replace(/```[\s\S]*?```/g, '').trim();
      }
    } else if (tab === 'javascript') {
      codeToInsert = extractCode(content, 'javascript') || extractCode(content, 'js');
      if (!codeToInsert && (content.includes('function') || content.includes('=>'))) {
        codeToInsert = content.replace(/```[\s\S]*?```/g, '').trim();
      }
    }

    if (!codeToInsert) {
      // Fallback: prendre tout le contenu sans les blocs de code
      codeToInsert = content.replace(/```[\s\S]*?```/g, '').trim();
    }

    if (codeToInsert) {
      onInsertCode(codeToInsert, tab);
      toast({
        title: "Code inséré",
        description: `Code ajouté dans l'onglet ${tab.toUpperCase()}`
      });
    } else {
      toast({
        title: "Aucun code détecté",
        description: "Impossible d'extraire le code de cette réponse",
        variant: "destructive"
      });
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copié",
        description: "Contenu copié dans le presse-papiers"
      });
    } catch (error) {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le contenu",
        variant: "destructive"
      });
    }
  };

  const handleQuickCommand = (command: string) => {
    setMessage(command);
  };

  return (
    <div className="h-full flex flex-col bg-card border-t border-border">
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            Assistant Code IA
          </h3>
          <Badge variant="outline" className="text-xs">
            {selectedModel}
          </Badge>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="p-2 border-b border-border bg-background/50">
        <div className="flex gap-1 flex-wrap">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd.command}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleQuickCommand(cmd.command)}
            >
              <cmd.icon className="w-3 h-3 mr-1" />
              {cmd.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">Assistant Code IA</p>
            <p className="text-xs">
              Utilisez les commandes rapides ou décrivez ce que vous voulez créer
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground border border-border'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  
                  {msg.role === 'assistant' && msg.type === 'code' && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleInsertCode(msg.content)}
                      >
                        <Code2 className="w-3 h-3 mr-1" />
                        Insérer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleInsertCode(msg.content, 'html')}
                      >
                        HTML
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleInsertCode(msg.content, 'css')}
                      >
                        CSS
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleInsertCode(msg.content, 'javascript')}
                      >
                        JS
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleCopy(msg.content, msg.id)}
                      >
                        {copiedId === msg.id ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 max-w-[85%]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                <span className="text-xs text-muted-foreground ml-2">IA génère du code...</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décrivez le code à générer ou utilisez /generate, /improve, /fix..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={2}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="self-end h-10 px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};