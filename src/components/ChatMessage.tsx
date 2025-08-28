import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bot, Sparkles, Cpu, Zap, Search, Download, FileText, File as FileIcon, Copy, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CodePreview } from "./CodePreview";
import { WebPreview } from "./WebPreview";
import { renderMarkdown } from "@/lib/markdown";

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
    "gpt-5-2025-08-07": { name: "GPT-5", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "gpt-5-mini-2025-08-07": { name: "GPT-5 Mini", provider: "OpenAI", icon: Zap, color: "openai" },
    "gpt-5-nano-2025-08-07": { name: "GPT-5 Nano", provider: "OpenAI", icon: Zap, color: "openai" },
    "gpt-4.1-2025-04-14": { name: "GPT-4.1", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "gpt-4.1-mini-2025-04-14": { name: "GPT-4.1 Mini", provider: "OpenAI", icon: Zap, color: "openai" },
    "o3-2025-04-16": { name: "O3", provider: "OpenAI", icon: Cpu, color: "openai" },
    "o4-mini-2025-04-16": { name: "O4 Mini", provider: "OpenAI", icon: Cpu, color: "openai" },
    "gpt-4o": { name: "GPT-4o (Legacy)", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "gpt-4o-mini": { name: "GPT-4o Mini (Legacy)", provider: "OpenAI", icon: Sparkles, color: "openai" },
    "o1-preview": { name: "o1-preview", provider: "OpenAI", icon: Cpu, color: "openai" },
    "o1-mini": { name: "o1-mini", provider: "OpenAI", icon: Cpu, color: "openai" },
    "gemini-2.5-flash": { name: "Gemini 2.5 Flash", provider: "Google AI", icon: Zap, color: "gemini" },
    "gemini-2.5-pro": { name: "Gemini 2.5 Pro", provider: "Google AI", icon: Sparkles, color: "gemini" },
    "gemini-2.5-flash-lite": { name: "Gemini 2.5 Flash Lite", provider: "Google AI", icon: Zap, color: "gemini" },
    "gemini-1.5-flash": { name: "Gemini 1.5 Flash", provider: "Google", icon: Zap, color: "gemini" },
    "gemini-1.5-pro": { name: "Gemini 1.5 Pro", provider: "Google", icon: Zap, color: "gemini" },
    "deepseek-chat": { name: "DeepSeek Chat", provider: "DeepSeek", icon: Cpu, color: "openai" },
    "auto-router": { name: "Auto Router", provider: "Smart", icon: Sparkles, color: "openai" },
    "ai-image": { name: "Image AI", provider: "AI", icon: Sparkles, color: "openai" },
    "veo-3": { name: "Veo 3", provider: "Google AI", icon: Sparkles, color: "gemini" },
    "runwayml": { name: "vo3", provider: "RunwayML Gen-3 Turbo", icon: Sparkles, color: "runway" }
  } as const;

  return models[modelId as keyof typeof models] || null;
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
        {!isUser && modelInfo && (
          <div className="flex items-center gap-2 mb-2">
            <modelInfo.icon className="w-3 h-3 text-muted-foreground" />
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                modelInfo.color === 'gemini' ? 'bg-gemini/20 text-gemini border-gemini/30' :
                modelInfo.color === 'runway' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                'bg-openai/20 text-openai border-openai/30'
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
            <div className="space-y-3">
              <audio controls src={message.content} className="w-full" />
              <div className={`flex ${isUser ? "justify-start" : "justify-end"} gap-2`}>
                <Button
                  type="button"
                  size="sm"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Télécharger l'audio"
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
            </div>
          ) : typeof message.content === 'string' && (message.content.startsWith('data:video') || (message.content.startsWith('http') && message.content.includes('.mp4'))) ? (
            <div className="space-y-3">
              <video 
                controls 
                src={message.content} 
                className="w-full max-w-md rounded-md shadow-md"
                poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggNUwyMCAxMkw4IDE5VjVaIiBmaWxsPSIjOTQ5NDk0Ii8+Cjwvc3ZnPgo="
              />
              <div className={`flex ${isUser ? "justify-start" : "justify-end"} gap-2`}>
                <Button
                  type="button"
                  size="sm"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Télécharger la vidéo"
                  onClick={async () => {
                    try {
                      const response = await fetch(message.content);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `video-${message.id || message.timestamp.getTime()}.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Vidéo téléchargée",
                        description: "La vidéo a été téléchargée avec succès",
                      });
                    } catch (e) {
                      console.error('Download error:', e);
                      toast({
                        title: "Téléchargement impossible",
                        description: "Le téléchargement a échoué. Veuillez réessayer.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : typeof message.content === 'string' && (message.content.startsWith('data:image') || message.content.startsWith('http')) ? (
            <div className="space-y-3">
              <img
                src={message.content}
                alt={`Image générée par ${modelInfo?.name || 'IA'}`}
                loading="lazy"
                className="max-w-full h-auto rounded-md shadow-md"
              />
              <div className={`flex ${isUser ? "justify-start" : "justify-end"} gap-2`}>
                <Button
                  type="button"
                  size="sm"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Télécharger l'image"
                  onClick={async () => {
                    try {
                      let blob: Blob;
                      let fileName = `image-${message.id || message.timestamp.getTime()}`;
                      
                      if (message.content.startsWith('data:image/')) {
                        const base64Data = message.content.split(',')[1];
                        const mimeType = message.content.split(';')[0].split(':')[1];
                        const ext = mimeType.split('/')[1] || 'png';
                        
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        blob = new Blob([byteArray], { type: mimeType });
                        fileName += `.${ext}`;
                      } else {
                        try {
                          const response = await fetch(message.content);
                          if (!response.ok) throw new Error('Failed to fetch image');
                          blob = await response.blob();
                          const ext = (blob.type && blob.type.split('/')[1]) || 'png';
                          fileName += `.${ext}`;
                        } catch (fetchError) {
                          console.log('Direct download failed, trying proxy...');
                          try {
                            const { data, error } = await supabase.functions.invoke('image-proxy', {
                              body: { url: message.content }
                            });
                            
                            if (error || !data.image) throw error || new Error('Proxy failed');
                            
                            const base64Data = data.image.split(',')[1];
                            const mimeType = data.image.split(';')[0].split(':')[1];
                            const ext = mimeType.split('/')[1] || 'png';
                            
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            blob = new Blob([byteArray], { type: mimeType });
                            fileName += `.${ext}`;
                          } catch (proxyError) {
                            console.log('Proxy failed, opening in new window');
                            window.open(message.content, '_blank');
                            toast({
                              title: "Image ouverte",
                              description: "L'image a été ouverte dans une nouvelle fenêtre. Vous pouvez la sauvegarder avec clic droit > Enregistrer l'image.",
                            });
                            return;
                          }
                        }
                      }
                      
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Image téléchargée",
                        description: `L'image a été téléchargée avec succès : ${fileName}`,
                      });
                      
                    } catch (e) {
                      console.error('Download error:', e);
                      toast({
                        title: "Téléchargement impossible",
                        description: "Le téléchargement a échoué. Veuillez réessayer ou régénérer l'image.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
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
            <div className="space-y-3">
              {(() => {
                const content = String(message.content);
                
                // Check if it's web content (HTML/CSS/JS)
                const hasWebContent = content.includes('```html') || content.includes('```css') || content.includes('```javascript') || 
                                    content.includes('```js') || content.includes('<html>') || content.includes('<!DOCTYPE') ||
                                    (content.includes('<div') || content.includes('<button') || content.includes('<p>'));
                
                // Check if it has code blocks
                const hasCodeBlocks = content.includes('```') || content.includes('`');
                
                if (hasWebContent) {
                  return <WebPreview content={content} />;
                } else if (hasCodeBlocks) {
                  return <CodePreview content={content} isUser={isUser} />;
                } else {
                  // Render markdown for regular text
                  return (
                    <div 
                      className="prose prose-sm max-w-none text-inherit"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                    />
                  );
                }
              })()}
              <div className={`flex ${isUser ? "justify-start" : "justify-end"} gap-2 flex-wrap`}>
                <Button
                  type="button"
                  size="sm"
                  variant={isUser ? "secondary" : "outline"}
                  aria-label="Copier le message"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(message.content).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*\*/g, '').replace(/(^|\n)#{1,6}\s*/g, '$1'));
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