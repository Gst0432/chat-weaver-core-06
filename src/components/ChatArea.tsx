import { useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  model?: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    content: "Bonjour ! Je suis votre assistant IA multi-plateforme. Je peux utiliser différents modèles pour répondre à vos questions. Comment puis-je vous aider aujourd'hui ?",
    role: "assistant",
    timestamp: new Date(),
    model: "gpt-4-turbo"
  }
];

interface ChatAreaProps {
  selectedModel: string;
}

export const ChatArea = ({ selectedModel }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulation d'une réponse de l'IA
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Voici une réponse simulée du modèle ${selectedModel}. Dans une vraie implémentation, ceci serait la réponse de l'API sélectionnée.`,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <ChatMessage 
              message={{
                id: "loading",
                content: "En train de réfléchir...",
                role: "assistant",
                timestamp: new Date(),
                model: selectedModel
              }}
              isLoading={true}
            />
          )}
        </div>
      </ScrollArea>
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};