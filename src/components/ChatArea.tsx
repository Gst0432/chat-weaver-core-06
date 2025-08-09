import { useEffect, useState } from "react";
import { Document as DocxDocument, Packer, Paragraph } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

// Helpers: generation of documents
const wrapText = (text: string, max = 90) =>
  text
    .split(/\r?\n/)
    .flatMap((line) => {
      const chunks: string[] = [];
      let current = line;
      while (current.length > max) {
        chunks.push(current.slice(0, max));
        current = current.slice(max);
      }
      chunks.push(current);
      return chunks;
    });

const createPdfDataUrl = async (text: string) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  const lineHeight = fontSize * 1.2;
  const lines = wrapText(text, 90);
  lines.forEach((line) => {
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  });
  return await pdfDoc.saveAsBase64({ dataUri: true });
};

const createDocxDataUrl = async (text: string) => {
  const doc = new DocxDocument({
    sections: [
      { properties: {}, children: text.split(/\r?\n/).map((l) => new Paragraph(l || " ")) },
    ],
  });
  const base64 = await Packer.toBase64String(doc);
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
};

const createPptxDataUrl = async (text: string) => {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText(text, { x: 0.5, y: 0.5, w: 9, h: 5, fontSize: 18 });
  const base64 = await pptx.write({ outputType: "base64" });
  return `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`;
};

interface ChatAreaProps {
  selectedModel: string;
  conversationId?: string | null;
  onConversationChange?: (id: string) => void;
}

export const ChatArea = ({ selectedModel, conversationId, onConversationChange }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [localConversationId, setLocalConversationId] = useState<string | null>(null);
  const effectiveConversationId = conversationId ?? localConversationId;

  useEffect(() => {
    if (!effectiveConversationId) return;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, role, content, model, created_at')
        .eq('conversation_id', effectiveConversationId)
        .order('created_at', { ascending: true });
      if (data) {
        const mapped = data.map((m: any) => ({
          id: m.id,
          content: m.content as string,
          role: m.role as 'user' | 'assistant',
          timestamp: new Date(m.created_at as string),
          model: (m.model as string) || undefined,
        }));
        setMessages(mapped);
      }
    })();
  }, [effectiveConversationId]);

  const ensureConversation = async (title: string) => {
    let cid = conversationId ?? localConversationId;
    if (cid) return cid;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Utilisateur non authentifié');
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title })
      .select('id')
      .maybeSingle();
    if (error || !data?.id) throw error || new Error('Création conversation échouée');
    setLocalConversationId(data.id);
    onConversationChange?.(data.id);
    return data.id as string;
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    const isUpload = typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'));

    let convId = effectiveConversationId as string | null;
    const titleBase = isUpload
      ? 'Pièce jointe'
      : (content.replace(/^data:[^,]+,/, '').slice(0, 60) || 'Nouvelle conversation');
    convId = await ensureConversation(titleBase);

    // Enregistrer le message utilisateur
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content,
      model: selectedModel,
    });

    // Si c'est un upload, on s'arrête ici sans appel modèle
    if (isUpload) return;

    setIsLoading(true);

    try {
      // Image generation via DALL·E when the user asks for an image using any OpenAI model
      const isUpload = typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'));
      const wantsImage = !isUpload && /(\bimage\b|\bphoto\b|\bpicture\b|\billustration\b|dessin|génère une image|genere une image|générer une image|crée une image|create an image|generate an image|logo|affiche)/i.test(content);
      if (selectedModel.includes('gpt') && (wantsImage || selectedModel === 'gpt-image-1')) {
        const { data, error } = await supabase.functions.invoke('dalle-image', {
          body: { prompt: content, size: '1024x1024' }
        });
        if (error) throw error;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data?.image || "Échec de génération d'image.",
          role: "assistant",
          timestamp: new Date(),
          model: selectedModel
        };

        setMessages(prev => [...prev, assistantMessage]);
        await supabase.from('messages').insert({
          conversation_id: convId as string,
          role: 'assistant',
          content: assistantMessage.content,
          model: selectedModel,
        });
        return;
      }

      // Document generation commands: /pdf, /docx, /pptx, /slide
      const cmdMatch = content.trim().match(/^\/(pdf|docx|pptx|slide)\s*(.*)$/i);
      if (cmdMatch) {
        const cmd = cmdMatch[1].toLowerCase();
        let bodyText = cmdMatch[2]?.trim();
        if (!bodyText) {
          const fallback = [...messages].reverse().find(m => typeof m.content === 'string' && !m.content.startsWith('data:') && !m.content.startsWith('http'));
          bodyText = (fallback?.content as string) || 'Document généré depuis le chat.';
        }

        let dataUrl = '';
        if (cmd === 'pdf') dataUrl = await createPdfDataUrl(bodyText);
        else if (cmd === 'docx') dataUrl = await createDocxDataUrl(bodyText);
        else dataUrl = await createPptxDataUrl(bodyText);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: dataUrl,
          role: 'assistant',
          timestamp: new Date(),
          model: selectedModel
        };
        setMessages(prev => [...prev, assistantMessage]);
        await supabase.from('messages').insert({
          conversation_id: convId as string,
          role: 'assistant',
          content: dataUrl,
          model: selectedModel,
        });
        return;
      }

      // Map existing messages to provider format
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const chatMessages = [
        { role: 'system', content: 'You are Chatelix, a helpful multilingual assistant.' },
        ...history,
        { role: 'user', content }
      ];

      let functionName = 'openai-chat';
      let model = 'gpt-4o-mini';
      if (selectedModel === 'gpt-4.1') {
        model = 'gpt-4.1-2025-04-14';
      } else if (selectedModel.includes('perplexity')) {
        functionName = 'perplexity-chat';
        model = 'sonar-small-online';
      } else if (selectedModel.includes('deepseek')) {
        functionName = 'deepseek-chat';
        model = 'deepseek-chat';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          messages: chatMessages,
          model,
          temperature: 0.5,
          max_tokens: 400
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