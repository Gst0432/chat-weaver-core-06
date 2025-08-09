import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card/30">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message... (Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne)"
                className="min-h-[60px] max-h-[200px] resize-none bg-background border-border pr-24 text-foreground placeholder:text-muted-foreground"
                disabled={disabled}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={!message.trim() || disabled}
              className="h-[60px] px-6 bg-gradient-primary hover:opacity-90 transition-opacity shadow-elegant"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Chat Weaver peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
};