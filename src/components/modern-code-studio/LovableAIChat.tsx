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
import { supabase } from "@/integrations/supabase/client";

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
  { icon: Component, label: "Todo App", prompt: "Crée une application todo complète avec React, TypeScript, Tailwind CSS et persistance locale" },
  { icon: Palette, label: "Dashboard Admin", prompt: "Génère un dashboard administrateur moderne avec sidebar, graphiques et gestion d'utilisateurs" },
  { icon: Bug, label: "E-commerce", prompt: "Crée un site e-commerce avec catalogue produits, panier et checkout" },
  { icon: Zap, label: "Blog App", prompt: "Développe une application de blog avec éditeur markdown et système de commentaires" },
  { icon: Lightbulb, label: "Landing Page", prompt: "Génère une landing page moderne avec sections hero, features, pricing et contact" },
  { icon: RefreshCw, label: "Améliorer", prompt: "Améliore l'interface utilisateur de ce composant avec des animations et un design moderne" },
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
      content: "Bonjour ! Je suis votre assistant IA Lovable pour le développement React moderne.\n\n✨ **Génération automatique de projet :** Décrivez simplement votre idée (ex: \"une todo app\", \"un dashboard admin\", \"un site e-commerce\") et je vais automatiquement :\n\n• Créer la structure complète React + Vite + Tailwind\n• Générer les composants nécessaires\n• Configurer les fonctionnalités de base\n• Ajouter les types TypeScript\n\nCommencez par me dire ce que vous voulez créer !",
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
      // Détecter si c'est une demande de création de projet complet
      const isProjectCreation = isProjectCreationRequest(input);
      
      if (isProjectCreation) {
        // Génération automatique de projet complet
        const projectPrompt = `Tu es Lovable AI, assistant expert en développement React moderne.

MISSION: Génère un projet React COMPLET et fonctionnel basé sur cette demande: "${input}"

STRUCTURE AUTOMATIQUE À GÉNÉRER:
1. Composant principal (App.tsx) avec structure complète
2. Styles Tailwind CSS avec design moderne 
3. Types TypeScript appropriés
4. Configuration automatique

TECHNOLOGIES:
- React 18 + TypeScript
- Tailwind CSS pour le styling
- Hooks modernes (useState, useEffect, etc.)
- Architecture component-based

REQUIREMENTS:
- Code PRODUCTION-READY immédiatement utilisable
- Design moderne et responsive
- Interface utilisateur intuitive
- Fonctionnalités de base implémentées
- Structure de projet scalable

EXEMPLE DE STRUCTURE ATTENDUE:
\`\`\`tsx
// Composant principal avec toutes les fonctionnalités
import React, { useState, useEffect } from 'react';

interface [Types appropriés] {
  // Types nécessaires
}

export default function App() {
  // État et logique
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Interface utilisateur complète */}
    </div>
  );
}
\`\`\`

\`\`\`css
/* Styles Tailwind + customs */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Styles personnalisés si nécessaire */
\`\`\`

\`\`\`typescript
// Types et utilitaires TypeScript
export interface [Interfaces]
export const [Utils]
\`\`\`

GÉNÈRE MAINTENANT LE PROJET COMPLET:`;

        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            message: projectPrompt,
            model: "gpt-4o"
          }
        });

        if (error) throw error;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: "assistant",
          timestamp: new Date(),
          type: 'code'
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Auto-insérer le code généré
        setTimeout(() => {
          extractReactCode(data.response);
        }, 1000);

      } else {
        // Génération normale pour améliorations
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
- Code prêt à utiliser avec des commentaires explicatifs
- Utilise Tailwind CSS pour tous les styles (classes modernes)
- TypeScript strict avec interfaces appropriées
- Composants fonctionnels avec hooks
- Responsive design mobile-first
- Animations fluides avec Tailwind
- Accessibilité (aria-labels, semantic HTML)

Demande utilisateur: ${input}`;

        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            message: lovablePrompt,
            model: "gpt-4o"
          }
        });

        if (error) throw error;
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response || "Désolé, impossible de générer une réponse.",
          role: "assistant",
          timestamp: new Date(),
          type: data.response?.includes('```') ? 'code' : 'text'
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error: any) {
      console.error('Lovable AI Error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Erreur technique : ${error.message || 'API indisponible'}.\n\nEssayez une demande simple ou reformulez votre demande.`,
        role: "assistant",
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erreur IA",
        description: "Vérifiez votre connexion et réessayez",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour détecter les demandes de création de projet
  const isProjectCreationRequest = (message: string): boolean => {
    const projectKeywords = [
      'crée', 'génère', 'développe', 'construis', 'fais',
      'todo', 'dashboard', 'blog', 'e-commerce', 'landing', 'portfolio',
      'app', 'application', 'site', 'plateforme', 'système',
      'page', 'interface', 'ui', 'frontend'
    ];
    
    const lowerMessage = message.toLowerCase();
    return projectKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           message.length > 20; // Messages longs = probablement création projet
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