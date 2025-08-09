import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bot, Sparkles, Cpu, Zap, Search, Download, FileText, File as FileIcon, Copy, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  onSpeak?: (text: string) => void;
  onDownloadTts?: (text: string) => void;
}

const getModelInfo = (modelId?: string) => {
  const models = {
    "gpt-4-turbo": { name: "GPT-4 Turbo", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "gpt-4.1": { name: "GTP-5", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "claude-3-sonnet": { name: "Claude 3 Sonnet", provider: "Anthropic", icon: Cpu, color: "claude" },
    "gemini-pro": { name: "Gemini Pro", provider: "Google", icon: Zap, color: "gemini" },
    "perplexity-pro": { name: "Perplexity Pro", provider: "Perplexity", icon: Search, color: "perplexity" },
    "deepseek-v3": { name: "DeepSeek V3", provider: "DeepSeek", icon: Cpu, color: "openai" }
  } as const;

  return models[modelId as keyof typeof models] || models["gpt-4-turbo"];
};

const sanitizeContent = (text: string) => {
  try {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/(^|\n)#{1,6}\s*/g, '$1');
  } catch {
    return text;
  }
};

export const ChatMessage = ({ message, isLoading, onSpeak, onDownloadTts }: ChatMessageProps) => {
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
          {typeof message.content === 'string' && message.content.startsWith('data:audio') ? (
            <div className="relative group">
              <audio controls src={message.content} className="w-full" />
              <Button
                type="button"
                size="icon"
                variant={isUser ? "secondary" : "outline"}
                aria-label="Télécharger l'audio"
                className="absolute top-2 right-2"
                onClick={() => {
                  const mime = message.content.slice(5, message.content.indexOf(';'));
                  const ext = (mime.split('/')[1] || 'mp3').split(';')[0];
                  const a = document.createElement('a');
                  a.href = message.content;
                  a.download = `audio-${message.id || message.timestamp.getTime()}.${ext}`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ) : typeof message.content === 'string' && (message.content.startsWith('data:image') || message.content.startsWith('http')) ? (
            <div className="relative group">
              <img
                src={message.content}
                alt={`Image générée par ${modelInfo.name}`}
                loading="lazy"
                className="max-w-full h-auto rounded-md shadow-md"
              />
              <Button
                type="button"
                size="icon"
                variant={isUser ? "secondary" : "outline"}
                aria-label="Télécharger l'image"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={async () => {
                  try {
                    const response = await fetch(message.content);
                    const blob = await response.blob();
                    const ext = (blob.type && blob.type.split('/')[1]) || 'png';
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `image-${message.id || message.timestamp.getTime()}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    toast({
                      title: "Téléchargement impossible",
                      description: "Le téléchargement direct a échoué. Réessayez ou régénérez l'image.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
) : (typeof message.content === 'string' && (message.content.startsWith('data:application/pdf') || message.content.startsWith('data:application/vnd.openxmlformats-officedocument'))) ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                {message.content.includes('presentationml.presentation') ? (
                  <FileIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                <div className="text-sm">
                  <div className="font-medium">
                    {message.content.startsWith('data:application/pdf') ? 'Document PDF' : (message.content.includes('wordprocessingml.document') ? 'Document DOCX' : 'Présentation PPTX')}
                  </div>
                  <div className="text-xs text-muted-foreground">Cliquez pour télécharger</div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={isUser ? "secondary" : "outline"}
                onClick={async () => {
                  try {
                    const response = await fetch(message.content);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${message.content.startsWith('data:application/pdf') ? 'document' : (message.content.includes('wordprocessingml.document') ? 'document' : 'presentation')}-${message.id || message.timestamp.getTime()}.${message.content.startsWith('data:application/pdf') ? 'pdf' : (message.content.includes('wordprocessingml.document') ? 'docx' : 'pptx')}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    toast({ title: "Téléchargement impossible", description: "Échec du téléchargement du fichier.", variant: "destructive" });
                  }
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="relative group">
              <div className="text-sm leading-relaxed whitespace-pre-wrap pr-20">
                {sanitizeContent(String(message.content))}
              </div>
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                <Button
                  type="button"
                  size="icon"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Lire (TTS)"
                  onClick={() => onSpeak?.(sanitizeContent(String(message.content)))}
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Télécharger (TTS)"
                  onClick={() => onDownloadTts?.(sanitizeContent(String(message.content)))}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Copier le message"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(sanitizeContent(String(message.content)));
                      toast({ title: "Copié", description: "Le message a été copié dans le presse‑papiers." });
                    } catch (e) {
                      toast({ title: "Échec de copie", description: "Impossible de copier le message.", variant: "destructive" });
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
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
