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
  Brain,
  Component,
  Zap,
  Palette,
  RefreshCw
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

interface LovableAIChatProps {
  currentCode: {
    tsx: string;
    css: string;
    typescript: string;
  };
  activeTab: 'tsx' | 'css' | 'typescript';
  onInsertCode: (code: string, tab: 'tsx' | 'css' | 'typescript') => void;
}

const lovablePrompts = [
  { icon: Component, label: "Composant React", prompt: "/create-component " },
  { icon: Palette, label: "Design moderne", prompt: "/improve-ui " },
  { icon: Bug, label: "Corriger bugs", prompt: "/fix-react-errors " },
  { icon: Zap, label: "Optimiser perf", prompt: "/optimize-performance " },
  { icon: Lightbulb, label: "Refactoring", prompt: "/refactor-code " },
  { icon: RefreshCw, label: "État React", prompt: "/manage-state " },
];

export const LovableAIChat = ({ currentCode, activeTab, onInsertCode }: LovableAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Message de bienvenue style Lovable
    const welcomeMessage: Message = {
      id: 'welcome',
      content: "Salut! Je suis votre assistant IA intégré, comme sur Lovable.dev 🚀\n\nJe peux vous aider à créer des composants React modernes, améliorer votre design avec Tailwind, gérer l'état avec TypeScript, et bien plus!\n\nQue voulez-vous construire ensemble?",
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

  const analyzeReactCode = () => {
    const analysis = {
      hasComponents: currentCode.tsx.includes('function ') || currentCode.tsx.includes('const '),
      hasHooks: currentCode.tsx.includes('useState') || currentCode.tsx.includes('useEffect'),
      hasTailwind: currentCode.css.includes('@tailwind') || currentCode.tsx.includes('className='),
      hasTypeScript: currentCode.typescript.length > 0
    };

    const analysisMessage: Message = {
      id: Date.now().toString(),
      content: `Analyse de votre projet React:\n\n✅ Composants: ${analysis.hasComponents ? 'Détectés' : 'Aucun'}\n✅ Hooks React: ${analysis.hasHooks ? 'Utilisés' : 'Non utilisés'}\n✅ Tailwind CSS: ${analysis.hasTailwind ? 'Configuré' : 'Non configuré'}\n✅ TypeScript: ${analysis.hasTypeScript ? 'Présent' : 'Vide'}\n\nSuggestions:\n${!analysis.hasHooks ? '• Ajouter useState/useEffect pour l\'interactivité\n' : ''}${!analysis.hasTailwind ? '• Utiliser Tailwind CSS pour un design moderne\n' : ''}${!analysis.hasTypeScript ? '• Ajouter des types TypeScript pour la robustesse\n' : ''}\n\nQue voulez-vous améliorer en premier?`,
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
      const reactContext = `
Contexte du projet React actuel:
- Onglet actif: ${activeTab.toUpperCase()}
- Composant React/TSX: ${currentCode.tsx.slice(0, 800)}${currentCode.tsx.length > 800 ? '...' : ''}
- Styles CSS/Tailwind: ${currentCode.css.slice(0, 400)}${currentCode.css.length > 400 ? '...' : ''}
- TypeScript utils: ${currentCode.typescript.slice(0, 400)}${currentCode.typescript.length > 400 ? '...' : ''}
`;

      const lovablePrompt = `Tu es l'assistant IA de Lovable.dev, expert en React, TypeScript et Tailwind CSS.

${reactContext}

Instructions spécialisées Lovable:
- Pour "/create-component": génère un composant React moderne avec TypeScript et Tailwind
- Pour "/improve-ui": améliore le design avec Tailwind CSS et animations
- Pour "/fix-react-errors": corrige les erreurs React/TypeScript
- Pour "/optimize-performance": optimise avec useMemo, useCallback, lazy loading
- Pour "/refactor-code": refactorise avec les bonnes pratiques React
- Pour "/manage-state": améliore la gestion d'état (useState, useContext, etc.)

Style de réponse Lovable:
- Code prêt à utiliser avec des commentaires explicatifs
- Utilise Tailwind CSS pour tous les styles (classes modernes)
- TypeScript strict avec interfaces appropriées
- Composants fonctionnels avec hooks
- Responsive design mobile-first
- Animations fluides avec Tailwind
- Accessibilité (aria-labels, semantic HTML)

Demande utilisateur: ${input}`;

      const response = await aiService.generateIntelligent(lovablePrompt, 'openai:gpt-4');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        role: "assistant",
        timestamp: new Date(),
        type: response.text.includes('```') ? 'code' : 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Lovable AI Error:', error);
      toast({
        title: "Erreur IA",
        description: "Impossible de générer une réponse",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractReactCode = (content: string, targetTab?: 'tsx' | 'css' | 'typescript') => {
    const tab = targetTab || activeTab;
    
    // Patterns améliorés pour React
    const patterns = {
      tsx: /```(?:tsx|jsx|typescript|react)\n([\s\S]*?)\n```/g,
      css: /```css\n([\s\S]*?)\n```/g,
      typescript: /```(?:typescript|ts)\n([\s\S]*?)\n```/g
    };
    
    const matches = [...content.matchAll(patterns[tab])];
    const code = matches.map(match => match[1]).join('\n\n');
    
    if (code) {
      onInsertCode(code, tab);
      toast({
        title: "Code inséré ✅",
        description: `Code React ajouté dans ${tab.toUpperCase()}`
      });
    } else {
      toast({
        title: "Aucun code trouvé",
        description: `Pas de code ${tab.toUpperCase()} dans cette réponse`,
        variant: "destructive"
      });
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Copié dans le presse-papier! 📋" });
    } catch (error) {
      toast({ title: "Erreur de copie", variant: "destructive" });
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/80 border-border/60">
      {/* Header Lovable Style */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-glow rounded-md flex items-center justify-center">
              <Brain className="w-3 h-3 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-sm">Lovable AI</h3>
            <Badge className="text-xs bg-gradient-to-r from-primary to-primary-glow">
              React Expert
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={analyzeReactCode}
            className="text-xs h-6 px-2"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Analyser
          </Button>
        </div>
      </div>

      {/* Quick Actions Lovable */}
      <div className="p-3 border-b border-border/60 bg-muted/30">
        <div className="grid grid-cols-2 gap-1">
          {lovablePrompts.map((prompt) => (
            <Button
              key={prompt.prompt}
              variant="ghost"
              size="sm"
              className="h-8 text-xs justify-start"
              onClick={() => handleQuickPrompt(prompt.prompt)}
            >
              <prompt.icon className="w-3 h-3 mr-1" />
              {prompt.label}
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
                  {message.role === 'user' ? 'Vous' : 'Lovable AI'}
                  {message.type && (
                    <Badge variant="outline" className="ml-2 text-xs h-4">
                      {message.type === 'code' ? 'React Code' : message.type}
                    </Badge>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
                {message.role === 'assistant' && message.type === 'code' && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractReactCode(message.content)}
                    >
                      <Code2 className="w-3 h-3 mr-1" />
                      Insérer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractReactCode(message.content, 'tsx')}
                    >
                      TSX
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractReactCode(message.content, 'css')}
                    >
                      CSS
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => extractReactCode(message.content, 'typescript')}
                    >
                      TS
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
                <span className="text-xs text-muted-foreground ml-2">Lovable AI réfléchit...</span>
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
            placeholder="Créez quelque chose d'incroyable avec React..."
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