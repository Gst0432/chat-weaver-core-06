import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Zap, Cpu } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
  model?: string;
  isStreaming: boolean;
  onComplete?: (content: string) => void;
}

const getModelInfo = (modelId?: string) => {
  const models = {
    "gpt-5-2025-08-07": { name: "GPT-5", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "claude-3-5-sonnet-20241022": { name: "Claude 3.5 Sonnet", provider: "Anthropic", icon: Sparkles, color: "claude" },
    "gemini-2.5-flash": { name: "Gemini 2.5 Flash", provider: "Google", icon: Zap, color: "gemini" },
    "deepseek-chat": { name: "DeepSeek Chat", provider: "DeepSeek", icon: Cpu, color: "deepseek" },
    "auto-router": { name: "Auto Router", provider: "Smart", icon: Sparkles, color: "auto" }
  } as const;

  return models[modelId as keyof typeof models] || { 
    name: modelId || "AI Model", 
    provider: "AI", 
    icon: Bot, 
    color: "default" 
  };
};

export const StreamingMessage = ({ content, model, isStreaming, onComplete }: StreamingMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const modelInfo = getModelInfo(model);

  // Effet de frappe naturelle
  useEffect(() => {
    if (!content || currentIndex >= content.length) {
      if (!isStreaming && onComplete && displayedContent) {
        onComplete(displayedContent);
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedContent(content.slice(0, currentIndex + 1));
      setCurrentIndex(prev => prev + 1);
    }, 20 + Math.random() * 30); // Vitesse de frappe variable pour plus de naturel

    return () => clearTimeout(timer);
  }, [content, currentIndex, isStreaming, onComplete, displayedContent]);

  // Réinitialiser quand le contenu change
  useEffect(() => {
    setCurrentIndex(0);
    setDisplayedContent('');
  }, [content]);

  return (
    <div className="flex gap-4">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-message-assistant text-foreground">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 max-w-[70%]">
        <div className="flex items-center gap-2 mb-2">
          <modelInfo.icon className="w-3 h-3 text-muted-foreground" />
          <Badge 
            variant="secondary" 
            className={`text-xs ${
              modelInfo.color === 'claude' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
              modelInfo.color === 'gemini' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              modelInfo.color === 'deepseek' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
              modelInfo.color === 'auto' ? 'bg-gradient-primary text-primary-foreground border-primary/30' :
              'bg-green-500/20 text-green-400 border-green-500/30'
            }`}
          >
            {modelInfo.name}
            {isStreaming && (
              <span className="ml-1 inline-flex">
                <span className="animate-pulse">●</span>
              </span>
            )}
          </Badge>
        </div>

        <Card className="p-4 bg-card border-border">
          <div className="space-y-2">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {displayedContent}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
              )}
            </div>
            
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Génération en cours...</span>
              </div>
            )}
          </div>
        </Card>

        <div className="text-xs text-muted-foreground mt-2">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isStreaming && <span className="ml-2 text-primary">Streaming</span>}
        </div>
      </div>
    </div>
  );
};