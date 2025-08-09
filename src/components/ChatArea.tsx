import { useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

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

    try {
      // Map existing messages to provider format
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const chatMessages = [
        { role: 'system', content: 'You are Chatelix, a helpful multilingual assistant.' },
        ...history,
        { role: 'user', content }
      ];

      let functionName = 'openai-chat';
      let model = 'gpt-4o-mini';
      if (selectedModel.includes('perplexity')) {
        functionName = 'perplexity-chat';
        model = 'llama-3.1-sonar-small-128k-online';
      } else if (selectedModel.includes('deepseek')) {
        functionName = 'deepseek-chat';
        model = 'deepseek-chat';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          messages: chatMessages,
          model,
          temperature: 0.7,
          max_tokens: 800
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data?.generatedText || 'Aucune réponse.',
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `Erreur: ${e?.message || 'Impossible d\'obtenir une réponse'}`,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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