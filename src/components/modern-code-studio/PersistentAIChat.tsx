import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Send, 
  Sparkles, 
  Code2, 
  Wand2, 
  Bug, 
  Lightbulb,
  Copy,
  CheckCheck,
  Brain
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { aiService } from "@/services/aiService";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  type?: 'code' | 'suggestion' | 'text';
}

interface PersistentAIChatProps {
  currentCode: {
    html: string;
    css: string;
    javascript: string;
  };
  activeTab: 'html' | 'css' | 'javascript';
  onInsertCode: (code: string, tab: 'html' | 'css' | 'javascript') => void;
}

const smartSuggestions = [
  { icon: Code2, label: "Générer composant", prompt: "/component " },
  { icon: Wand2, label: "Améliorer design", prompt: "/improve-design " },
  { icon: Bug, label: "Corriger erreurs", prompt: "/fix-errors " },
  { icon: Lightbulb, label: "Optimiser", prompt: "/optimize " },
];

export const PersistentAIChat = ({ currentCode, activeTab, onInsertCode }: PersistentAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ajouter un message de bienvenue intelligent
    const welcomeMessage: Message = {
      id: 'welcome',
      content: "Bonjour! Je suis votre assistant IA intégré. Je vois que vous travaillez sur un projet. Voulez-vous que je l'analyse et vous propose des améliorations?",
      role: "assistant",
      timestamp: new Date(),
      type: 'suggestion'
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const analyzeCode = () => {
    const hasContent = currentCode.html || currentCode.css || currentCode.javascript;
    if (!hasContent) return;

    const analysisMessage: Message = {
      id: Date.now().toString(),
      content: `Analyse du code:\n\n✅ HTML: ${currentCode.html ? 'Présent' : 'Vide'}\n✅ CSS: ${currentCode.css ? 'Présent' : 'Vide'}\n✅ JavaScript: ${currentCode.javascript ? 'Présent' : 'Vide'}\n\nSuggestions d'amélioration disponibles. Que souhaitez-vous améliorer?`,
      role: "assistant",
      timestamp: new Date(),
      type: 'suggestion'
    };
    
    setMessages(prev => [...prev, analysisMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const codeContext = `
Contexte du projet actuel:
- Onglet actif: ${activeTab.toUpperCase()}
- Code HTML: ${currentCode.html.slice(0, 500)}${currentCode.html.length > 500 ? '...' : ''}
- Code CSS: ${currentCode.css.slice(0, 500)}${currentCode.css.length > 500 ? '...' : ''}
- Code JavaScript: ${currentCode.javascript.slice(0, 500)}${currentCode.javascript.length > 500 ? '...' : ''}
`;

      const prompt = `Tu es un assistant de développement web expert intégré dans un IDE moderne.

${codeContext}

Instructions spéciales:
- Si la demande commence par "/component": génère un composant web complet
- Si elle commence par "/improve-design": améliore l'apparence et l'UX
- Si elle commence par "/fix-errors": corrige les erreurs potentielles
- Si elle commence par "/optimize": optimise les performances
- Toujours fournir du code prêt à utiliser
- Utilise des commentaires explicatifs
- Sois créatif et moderne dans tes suggestions

Demande: ${input}`;

      const response = await aiService.generateIntelligent(prompt, 'openai:gpt-4');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        role: "assistant",
        timestamp: new Date(),
        type: response.text.includes('```') ? 'code' : 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        title: "Erreur IA",
        description: "Impossible de générer une réponse",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractAndInsertCode = (content: string, targetTab?: 'html' | 'css' | 'javascript') => {
    const tab = targetTab || activeTab;
    
    // Extraction intelligente du code
    const patterns = {
      html: /```(?:html|jsx)\n([\s\S]*?)\n```/g,
      css: /```css\n([\s\S]*?)\n```/g,
      javascript: /```(?:javascript|js)\n([\s\S]*?)\n```/g
    };
    
    const matches = [...content.matchAll(patterns[tab])];
    const code = matches.map(match => match[1]).join('\n');
    
    if (code) {
      onInsertCode(code, tab);
      toast({
        title: "Code inséré",
        description: `Code ajouté dans l'onglet ${tab.toUpperCase()}`
      });
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Copié!" });
    } catch (error) {
      toast({ title: "Erreur de copie", variant: "destructive" });
    }
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/80 border-border/60">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-glow rounded-md flex items-center justify-center">
              <Brain className="w-3 h-3 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-sm">Assistant IA</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={analyzeCode}
            className="text-xs h-6 px-2"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Analyser
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-border/60 bg-muted/30">
        <div className="grid grid-cols-2 gap-1">
          {smartSuggestions.map((suggestion) => (
            <Button
              key={suggestion.prompt}
              variant="ghost"
              size="sm"
              className="h-8 text-xs justify-start"
              onClick={() => setInput(suggestion.prompt)}
            >
              <suggestion.icon className="w-3 h-3 mr-1" />
              {suggestion.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-primary to-primary-glow text-primary-foreground'
                    : message.type === 'suggestion'
                    ? 'bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30'
                    : 'bg-muted border border-border/60'
                }`}
              >
                <div className="text-xs font-medium mb-1 opacity-60">
                  {message.role === 'user' ? 'Vous' : 'Assistant IA'}
                  {message.type && (
                    <Badge variant="outline" className="ml-2 text-xs h-4">
                      {message.type}
                    </Badge>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
                {message.role === 'assistant' && message.type === 'code' && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractAndInsertCode(message.content)}
                    >
                      <Code2 className="w-3 h-3 mr-1" />
                      Insérer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractAndInsertCode(message.content, 'html')}
                    >
                      HTML
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractAndInsertCode(message.content, 'css')}
                    >
                      CSS
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractAndInsertCode(message.content, 'javascript')}
                    >
                      JS
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleCopy(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
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
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 max-w-[85%] border border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                <span className="text-xs text-muted-foreground ml-2">L'IA réfléchit...</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border/60 bg-background/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Décrivez ce que vous voulez créer ou améliorer..."
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            rows={2}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="self-end h-10 px-3 bg-gradient-to-r from-primary to-primary-glow"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};