import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User, Bot, Sparkles, Cpu, Zap, Search } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  model?: string;
}

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const getModelInfo = (modelId?: string) => {
  const models = {
    "gpt-4-turbo": { name: "GPT-4 Turbo", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "claude-3-sonnet": { name: "Claude 3 Sonnet", provider: "Anthropic", icon: Cpu, color: "claude" },
    "gemini-pro": { name: "Gemini Pro", provider: "Google", icon: Zap, color: "gemini" },
    "perplexity-pro": { name: "Perplexity Pro", provider: "Perplexity", icon: Search, color: "perplexity" },
    "deepseek-v3": { name: "DeepSeek V3", provider: "DeepSeek", icon: Cpu, color: "openai" }
  } as const;

  return models[modelId as keyof typeof models] || models["gpt-4-turbo"];
};

export const ChatMessage = ({ message, isLoading }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const modelInfo = getModelInfo(message.model);

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-message-user text-primary-foreground" : "bg-message-assistant text-foreground"}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-[70%] ${isUser ? "text-right" : "text-left"}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <modelInfo.icon className="w-3 h-3 text-muted-foreground" />
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                modelInfo.color === 'openai' ? 'bg-openai/20 text-openai border-openai/30' :
                modelInfo.color === 'claude' ? 'bg-claude/20 text-claude border-claude/30' :
                modelInfo.color === 'gemini' ? 'bg-gemini/20 text-gemini border-gemini/30' :
                'bg-perplexity/20 text-perplexity border-perplexity/30'
              }`}
            >
              {modelInfo.name}
            </Badge>
          </div>
        )}

        <Card 
          className={`p-4 ${
            isUser 
              ? "bg-gradient-primary text-primary-foreground border-primary/30" 
              : "bg-card border-border"
          } ${isLoading ? "animate-pulse" : ""}`}
        >
          {typeof message.content === 'string' && (message.content.startsWith('data:image') || message.content.startsWith('http')) ? (
            <a
              href={message.content}
              download={`image-${message.id}.png`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={message.content}
                alt={`Image générée par ${modelInfo.name}`}
                loading="lazy"
                className="max-w-full h-auto rounded-md shadow-md"
              />
            </a>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </Card>

        <div className={`text-xs text-muted-foreground mt-2 ${isUser ? "text-right" : "text-left"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
