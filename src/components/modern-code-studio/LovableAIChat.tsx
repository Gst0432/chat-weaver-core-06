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
    // Message de bienvenue adaptatif
    const hasExistingCode = currentCode.tsx.length > 100 || currentCode.css.length > 50;
    
    const welcomeMessage: Message = {
      id: 'welcome',
      content: hasExistingCode 
        ? "👋 Bonjour ! Je vois que vous avez déjà du code dans votre projet.\n\n💬 **Mode conversation :** Vous pouvez maintenant me demander des modifications en langage naturel :\n\n• \"Ajoute un bouton de connexion\"\n• \"Change la couleur en bleu\"\n• \"Rends le design plus moderne\"\n• \"Ajoute une sidebar\"\n• \"Corrige les erreurs\"\n\nJe vais analyser votre code existant et appliquer les changements demandés !"
        : "🚀 **Bienvenue dans Lovable Code Studio !**\n\n✨ **Génération d'architecture complète :** Décrivez simplement votre projet en une phrase et je vais créer automatiquement :\n\n• 📁 **Structure complète** React + TypeScript + Tailwind\n• 🎨 **Interface utilisateur** moderne et responsive  \n• ⚡ **Fonctionnalités de base** prêtes à l'emploi\n• 🔧 **Architecture scalable** et maintenir\n\n**Exemples :**\n• \"Une todo app avec drag & drop\"\n• \"Un dashboard admin avec graphiques\"\n• \"Un site e-commerce avec panier\"\n• \"Une landing page pour SaaS\"\n\n**Commencez par décrire votre projet !**",
      role: "assistant",
      timestamp: new Date(),
      type: 'suggestion'
    };
    setMessages([welcomeMessage]);
  }, [currentCode.tsx, currentCode.css]);

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
      // Détecter le type d'interaction
      const hasExistingCode = currentCode.tsx.length > 100 || currentCode.css.length > 50;
      const isArchitectureCreation = !hasExistingCode && isNewProjectRequest(input);
      const isModificationRequest = hasExistingCode && isModificationRequestFn(input);
      
      if (isArchitectureCreation) {
        // 🏗️ GÉNÉRATION ARCHITECTURE COMPLÈTE
        const architecturePrompt = `Tu es Lovable AI, architecte expert en développement React moderne.

🎯 MISSION ARCHITECTURALE: Crée une architecture React COMPLÈTE et FONCTIONNELLE pour: "${input}"

📐 ARCHITECTURE OBLIGATOIRE:
1. **App.tsx** - Composant principal avec toute la logique métier
2. **Styles.css** - Design système complet avec Tailwind + customs
3. **Utils.ts** - Types TypeScript + fonctions utilitaires + hooks

🛠️ STACK TECHNIQUE:
- React 18 + TypeScript strict
- Tailwind CSS + design système moderne
- Hooks React (useState, useEffect, useCallback, useMemo)
- Architecture component-based scalable

✨ EXIGENCES QUALITÉ:
- Code PRODUCTION-READY immédiatement déployable
- Interface utilisateur moderne et intuitive
- Responsive design mobile-first parfait
- Interactions fluides avec micro-animations
- Gestion d'état robuste et performante
- Types TypeScript complets et stricts
- Accessibilité (ARIA, semantic HTML)
- SEO optimized (meta tags, structure)

📝 FORMAT DE RÉPONSE OBLIGATOIRE:

\`\`\`tsx
// 🏗️ ARCHITECTURE COMPLÈTE - App.tsx
import React, { useState, useEffect, useCallback } from 'react';

// Types métier complets
interface [NomInterface] {
  // Propriétés avec types stricts
}

// Hook personnalisé si nécessaire
const use[NomHook] = () => {
  // Logique réutilisable
};

export default function App() {
  // 🔥 ÉTAT GLOBAL DE L'APPLICATION
  const [state, setState] = useState<TypeState>({});
  
  // 🎯 LOGIQUE MÉTIER COMPLÈTE
  const handleAction = useCallback(() => {
    // Implémentation complète
  }, []);

  // 🎨 INTERFACE UTILISATEUR COMPLÈTE
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 🏠 Header/Navigation */}
      <header className="bg-white shadow-sm border-b">
        {/* Navigation complète */}
      </header>

      {/* 📱 Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Contenu principal avec toutes les fonctionnalités */}
      </main>

      {/* 🦶 Footer */}
      <footer className="bg-gray-900 text-white py-8">
        {/* Footer complet */}
      </footer>
    </div>
  );
}
\`\`\`

\`\`\`css
/* 🎨 DESIGN SYSTÈME COMPLET - Styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 🎯 Variables CSS personnalisées */
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --shadow-elegant: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
  --animation-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 🚀 Classes utilitaires personnalisées */
@layer components {
  .btn-primary {
    @apply bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300;
  }
  
  .card-elegant {
    @apply bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300;
  }
  
  .text-gradient {
    @apply bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent;
  }
}

/* 🎭 Animations personnalisées */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

/* 📱 Responsive design optimisé */
@media (max-width: 768px) {
  .container {
    @apply px-4;
  }
}
\`\`\`

\`\`\`typescript
// 🔧 TYPES & UTILITAIRES - Utils.ts

// 📝 Types métier principaux
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// 🎯 Types pour l'état de l'application
export interface AppState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// 🛠️ Fonctions utilitaires
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// 🎨 Constantes de design
export const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
} as const;

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
} as const;

// 🚀 Hook personnalisé pour les API calls
export const useApi = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
};
\`\`\`

🎯 GÉNÈRE MAINTENANT L'ARCHITECTURE COMPLÈTE:`;

        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            messages: [{ role: 'user', content: architecturePrompt }],
            model: "gpt-4o",
            max_tokens: 4000
          }
        });

        if (error) throw error;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.generatedText,
          role: "assistant",
          timestamp: new Date(),
          type: 'code'
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Auto-insérer le code généré après un court délai
        setTimeout(() => {
          extractAndApplyAllCode(data.generatedText);
        }, 1000);

      } else if (isModificationRequest || hasExistingCode) {
        // 💬 MODE MODIFICATION CONVERSATIONNEL
        const modificationPrompt = `Tu es Lovable AI, expert en React et modification de code existant.

🔄 MISSION: Modifie le code existant selon cette demande: "${input}"

📝 CODE ACTUEL:
=== App.tsx (${currentCode.tsx.length} caractères) ===
\`\`\`tsx
${currentCode.tsx}
\`\`\`

=== Styles.css (${currentCode.css.length} caractères) ===
\`\`\`css
${currentCode.css}
\`\`\`

=== Utils.ts (${currentCode.typescript.length} caractères) ===
\`\`\`typescript
${currentCode.typescript}
\`\`\`

🎯 INSTRUCTIONS MODIFICATION:
- Analyse le code existant et comprend sa structure
- Applique UNIQUEMENT la modification demandée
- Conserve tout le code existant qui fonctionne
- Retourne SEULEMENT les fichiers modifiés
- Utilise les mêmes conventions de nommage
- Maintiens la cohérence du design et de l'architecture
- Optimise la performance si possible

⚡ TYPES DE MODIFICATIONS SUPPORTÉES:
- Ajout de composants/fonctionnalités
- Modification du design/styling
- Correction de bugs
- Refactoring/optimisation
- Ajout d'interactions/animations
- Modification de l'état/logique

📤 FORMAT RÉPONSE:
Explique brièvement ce que tu vas modifier, puis fournis le code modifié dans les blocs appropriés.

\`\`\`tsx
// Code TSX modifié (seulement si nécessaire)
\`\`\`

\`\`\`css  
// Code CSS modifié (seulement si nécessaire)
\`\`\`

\`\`\`typescript
// Code TypeScript modifié (seulement si nécessaire)
\`\`\`

🚀 APPLIQUE LA MODIFICATION MAINTENANT:`;

        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            messages: [{ role: 'user', content: modificationPrompt }],
            model: "gpt-4o",
            max_tokens: 3000
          }
        });

        if (error) throw error;
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.generatedText || "Désolé, impossible de générer une réponse.",
          role: "assistant",
          timestamp: new Date(),
          type: data.generatedText?.includes('```') ? 'code' : 'text'
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Auto-appliquer les modifications si du code est détecté
        if (data.generatedText?.includes('```')) {
          setTimeout(() => {
            extractAndApplyAllCode(data.generatedText);
          }, 1000);
        }

      } else {
        // 🤔 MODE CONVERSATION GÉNÉRALE
        const generalPrompt = `Tu es Lovable AI. L'utilisateur dit: "${input}"
        
Réponds de manière conversationnelle et propose des suggestions concrètes pour leur projet React.`;

        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            messages: [{ role: 'user', content: generalPrompt }],
            model: "gpt-4o",
            max_tokens: 1000
          }
        });

        if (error) throw error;
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.generatedText || "Désolé, impossible de générer une réponse.",
          role: "assistant",
          timestamp: new Date(),
          type: 'text'
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

  // Fonction pour détecter les demandes de nouveau projet
  const isNewProjectRequest = (message: string): boolean => {
    const creationKeywords = [
      'crée', 'génère', 'développe', 'construis', 'fais', 'créer',
      'app', 'application', 'site', 'plateforme', 'système',
      'todo', 'dashboard', 'blog', 'e-commerce', 'landing', 'portfolio'
    ];
    
    const lowerMessage = message.toLowerCase();
    return creationKeywords.some(keyword => lowerMessage.includes(keyword)) &&
           message.length > 10;
  };

  // Fonction pour détecter les demandes de modification
  const isModificationRequestFn = (message: string): boolean => {
    const modificationKeywords = [
      'ajoute', 'modifie', 'change', 'améliore', 'corrige', 'supprime',
      'met', 'rend', 'fait', 'transforme', 'ajuste', 'optimise',
      'couleur', 'taille', 'position', 'style', 'design', 'bouton',
      'plus', 'moins', 'mieux', 'autre', 'différent'
    ];
    
    const lowerMessage = message.toLowerCase();
    return modificationKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Fonction améliorée pour extraire et appliquer tout le code
  const extractAndApplyAllCode = (content: string) => {
    const blocks = {
      tsx: extractCodeBlock(content, 'tsx'),
      css: extractCodeBlock(content, 'css'), 
      typescript: extractCodeBlock(content, 'typescript')
    };

    let appliedCount = 0;

    // Appliquer chaque bloc trouvé
    Object.entries(blocks).forEach(([type, code]) => {
      if (code.trim()) {
        onInsertCode(code, type as 'tsx' | 'css' | 'typescript');
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      toast({
        title: `✅ Code appliqué automatiquement`,
        description: `${appliedCount} fichier(s) mis à jour dans votre projet`
      });
    } else {
      toast({
        title: "ℹ️ Réponse conversationnelle",
        description: "Pas de code à appliquer dans cette réponse",
        variant: "default"
      });
    }
  };

  const extractCodeBlock = (content: string, type: 'tsx' | 'css' | 'typescript'): string => {
    const patterns = {
      tsx: /```(?:tsx|jsx|typescript|react)\n([\s\S]*?)\n```/g,
      css: /```css\n([\s\S]*?)\n```/g,
      typescript: /```(?:typescript|ts)\n([\s\S]*?)\n```/g
    };
    
    const matches = [...content.matchAll(patterns[type])];
    return matches.map(match => match[1]).join('\n\n');
  };

  // Fonction legacy pour compatibilité avec les boutons d'insertion manuelle
  const extractReactCode = (content: string, targetTab?: 'tsx' | 'css' | 'typescript') => {
    const tab = targetTab || activeTab;
    const code = extractCodeBlock(content, tab);
    
    if (code.trim()) {
      onInsertCode(code, tab);
      toast({
        title: "Code inséré ✅",
        description: `Code ajouté dans ${tab.toUpperCase()}`
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