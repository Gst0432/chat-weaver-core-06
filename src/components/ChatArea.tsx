import { useEffect, useState } from "react";
import { Document as DocxDocument, Packer, Paragraph } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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

const cleanDocText = (text: string) => {
  return text
    .split(/\r?\n/)
    .filter(line => !/^#{1,6}\s*Stratégies de vente\s*:?\s*$/i.test(line))
    .map(l => l.replace(/^\-\s*\*\*\s*/g, '- ').replace(/\*\*/g, ''))
    .join('\n');
};

const dataUrlToPng = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0);
      try { resolve(canvas.toDataURL('image/png')); } catch (err) { reject(err as any); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

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
}

export const ChatArea = ({ selectedModel }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Charger la dernière conversation (30 jours)
  useEffect(() => {
    const loadLatest = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .gte('created_at', thirtyDaysAgo)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!convs || convs.length === 0) return;
      const convoId = convs[0].id as string;
      setCurrentConversationId(convoId);
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, role, created_at, model')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });
      if (msgs && msgs.length) {
        setMessages(msgs.map((m: any) => ({
          id: m.id as string,
          content: m.content as string,
          role: m.role as 'user' | 'assistant',
          timestamp: new Date(m.created_at as string),
          model: m.model as string | undefined,
        })));
      }
    };
    loadLatest();
  }, []);

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
      // Assurer l'existence d'une conversation
      let convoId = currentConversationId;
      if (!convoId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Non authentifié');
        const title = (content.split('\n')[0] || 'Nouvelle conversation').slice(0, 80);
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({ title, user_id: user.id })
          .select('id')
          .maybeSingle();
        if (convError) throw convError;
        if (!conv) throw new Error('Conversation non créée');
        convoId = conv.id as string;
        setCurrentConversationId(convoId);
      }

      // Sauvegarder le message utilisateur
      await supabase.from('messages').insert({
        conversation_id: convoId,
        role: 'user',
        content,
        model: selectedModel
      });

      // Si upload (data URL), gérer image/PDF
      if (typeof content === 'string' && content.startsWith('data:')) {
        // Fichier attaché: on attend une instruction utilisateur avant d'analyser
        return;
      }

      // Si un fichier a été ajouté récemment, décider: analyse (vision/file) OU génération d'image selon le prompt
      const isUpload = typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'));
      const wantsImage = !isUpload && /(\bimage\b|\bphoto\b|\bpicture\b|\billustration\b|dessin|génère une image|genere une image|générer une image|crée une image|create an image|generate an image|logo|affiche)/i.test(content);

      const attachment = [...messages].reverse().find(m => typeof m.content === 'string' && (m.content as string).startsWith('data:'));
      if (attachment && typeof content === 'string' && !content.startsWith('data:')) {
        const att = attachment.content as string;
        const mimeAtt = att.slice(5, att.indexOf(';'));
        // Si le prompt demande une image, on ne fait PAS l'analyse : on laissera la branche génération gérer plus bas
        if (!wantsImage && mimeAtt.startsWith('image/')) {
          const { data, error } = await supabase.functions.invoke('vision-analyze', {
            body: { image: att, prompt: content }
          });
          if (error) throw error;
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data?.generatedText || 'Analyse indisponible.',
            role: 'assistant',
            timestamp: new Date(),
            model: selectedModel
          };
          setMessages(prev => [...prev, assistantMessage]);
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: assistantMessage.content,
            model: selectedModel
          });
          return;
        } else if (!wantsImage && (mimeAtt === 'application/pdf' || mimeAtt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
          const base64 = att.split(',')[1] || '';
          const { data, error } = await supabase.functions.invoke('file-analyze', {
            body: {
              fileBase64: base64,
              fileName: mimeAtt === 'application/pdf' ? 'document.pdf' : 'document.docx',
              mime: mimeAtt,
              prompt: content
            }
          });
          if (error) throw error;
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data?.generatedText || 'Analyse indisponible.',
            role: 'assistant',
            timestamp: new Date(),
            model: selectedModel
          };
          setMessages(prev => [...prev, assistantMessage]);
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: assistantMessage.content,
            model: selectedModel
          });
          return;
        }
      }

      // Génération d'image (DALL·E) si demandé
      if (selectedModel.includes('gpt') && (wantsImage || selectedModel === 'gpt-image-1')) {
        // Si une image est jointe récemment, utiliser la variation/édition basée sur cette image
        const imageAttachment = [...messages].reverse().find(m => typeof m.content === 'string' && (m.content as string).startsWith('data:'));
        let genData: any | null = null;
        let genError: any | null = null;

        if (imageAttachment) {
          const att = imageAttachment.content as string;
          const mimeAtt = att.slice(5, att.indexOf(';'));
          if (mimeAtt.startsWith('image/')) {
            const imgToSend = att.startsWith('data:image/png') ? att : await dataUrlToPng(att);
            const enhancedPrompt = `Modifie uniquement l’image fournie: ${content}. Conserve le style et la composition, ajoute précisément l’élément demandé sans altérer le reste.`;
            const { data, error } = await supabase.functions.invoke('dalle-variation', {
              body: { image: imgToSend, prompt: enhancedPrompt, size: '1024x1024' }
            });
            genData = data; genError = error;
          }
        }

        // Si pas d'image jointe ou pas d'image valide, fallback à génération par prompt seul
        if (!genData && !genError) {
          const { data, error } = await supabase.functions.invoke('dalle-image', {
            body: { prompt: content, size: '1024x1024' }
          });
          genData = data; genError = error;
        }

        if (genError) throw genError;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: genData?.image || "Échec de génération d'image.",
          role: 'assistant',
          timestamp: new Date(),
          model: selectedModel
        };

        setMessages(prev => [...prev, assistantMessage]);

        await supabase.from('messages').insert({
          conversation_id: convoId,
          role: 'assistant',
          content: assistantMessage.content,
          model: selectedModel
        });
        return;
      }

      // Commandes de génération de documents: /pdf, /docx, /pptx, /slide
      const cmdMatch = content.trim().match(/^\/(pdf|docx|pptx|slide)\s*(.*)$/i);
      if (cmdMatch) {
        const cmd = cmdMatch[1].toLowerCase();
        let bodyText = cmdMatch[2]?.trim();
        if (!bodyText) {
          const fallback = [...messages].reverse().find(m => typeof m.content === 'string' && !m.content.startsWith('data:') && !m.content.startsWith('http'));
          bodyText = (fallback?.content as string) || 'Document généré depuis le chat.';
        }

        bodyText = cleanDocText(bodyText);
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
          conversation_id: convoId,
          role: 'assistant',
          content: assistantMessage.content,
          model: selectedModel
        });
        return;
      }

      // Historique de messages pour le provider
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const chatMessages = [
        { role: 'system', content: 'You are Chatelix, a helpful multilingual assistant.' },
        ...history,
        { role: 'user', content }
      ];

      // Normalisation du modèle côté front pour correspondre aux fonctions backend disponibles
      let functionName = 'openai-chat';
      let model = 'gpt-4o-mini'; // modèle supporté par openai-chat (chat/completions)

      // Adapter selon la sélection de l'utilisateur sans casser la compatibilité backend
      if (selectedModel === 'gpt-4.1') {
        // gpt-4.1 est un modèle de l'API Responses: on mappe vers gpt-4o-mini pour chat
        model = 'gpt-4o-mini';
      } else if (selectedModel.includes('perplexity')) {
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

      await supabase.from('messages').insert({
        conversation_id: convoId,
        role: 'assistant',
        content: assistantMessage.content,
        model: selectedModel
      });
    } catch (e: any) {
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `Erreur: ${e?.message || "Impossible d'obtenir une réponse"}`,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Sauvegarde aussi l'erreur comme message assistant
      if (currentConversationId) {
        await supabase.from('messages').insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: assistantMessage.content,
          model: selectedModel
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportDocument = async (type: 'pdf' | 'docx' | 'pptx') => {
    try {
      let bodyText = '';
      const fallback = [...messages].reverse().find(m => typeof m.content === 'string' && !m.content.startsWith('data:') && !m.content.startsWith('http'));
      bodyText = (fallback?.content as string) || 'Document généré depuis le chat.';

      bodyText = cleanDocText(bodyText);

      let dataUrl = '';
      if (type === 'pdf') dataUrl = await createPdfDataUrl(bodyText);
      else if (type === 'docx') dataUrl = await createDocxDataUrl(bodyText);
      else dataUrl = await createPptxDataUrl(bodyText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: dataUrl,
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, assistantMessage]);

      let convoId = currentConversationId;
      if (!convoId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Non authentifié');
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({ title: 'Documents générés', user_id: user.id })
          .select('id')
          .maybeSingle();
        if (convError) throw convError;
        convoId = conv?.id as string;
        setCurrentConversationId(convoId);
      }

      await supabase.from('messages').insert({
        conversation_id: convoId,
        role: 'assistant',
        content: assistantMessage.content,
        model: selectedModel
      });
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        content: `Erreur export: ${e?.message || 'échec'}`,
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel
      }]);
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
      <div className="border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Exporter le dernier contenu:</span>
          <Button variant="secondary" size="sm" onClick={() => exportDocument('pdf')}>PDF</Button>
          <Button variant="secondary" size="sm" onClick={() => exportDocument('docx')}>DOCX</Button>
          <Button variant="secondary" size="sm" onClick={() => exportDocument('pptx')}>PPTX</Button>
        </div>
      </div>
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};