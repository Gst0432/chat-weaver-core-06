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

const initialMessages: Message[] = [];

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
  sttProvider: 'openai' | 'google';
  ttsProvider: 'openai' | 'google';
  ttsVoice: string;
  systemPrompt?: string;
  safeMode?: boolean;
  isLandingMode?: boolean;
  onAuthRequired?: () => void;
}

export const ChatArea = ({ selectedModel, sttProvider, ttsProvider, ttsVoice, systemPrompt, safeMode, isLandingMode = false, onAuthRequired }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const createNewConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ title: 'Nouvelle conversation', user_id: user.id })
        .select('id')
        .maybeSingle();
      if (convError) throw convError;
      setCurrentConversationId(conv?.id as string);
      setMessages([]);
    } catch (e) {
      console.error('Nouveau chat échoué', e);
    }
  };

  // TTS: synthétiser et lire la réponse via OpenAI ou Google avec fallback
  const synthesizeAndPlay = async (text: string) => {
    const tryInvoke = async (provider: 'openai' | 'google') => {
      const fn = provider === 'google' ? 'google-tts' : 'text-to-voice';
      const lang = (ttsVoice && ttsVoice.includes('-')) ? ttsVoice.split('-').slice(0,2).join('-') : 'fr-FR';
      const body = provider === 'google'
        ? { text, languageCode: lang, voiceName: ttsVoice || undefined, ssmlGender: 'NEUTRAL', audioEncoding: 'MP3' }
        : { text, voice: ttsVoice || 'alloy', format: 'mp3' };
      return await supabase.functions.invoke(fn, { body });
    };
    try {
      if (!text || /^data:/.test(text)) return; // éviter les images/documents
      let { data, error } = await tryInvoke(ttsProvider);
      if (error) {
        const fallbackProvider = ttsProvider === 'google' ? 'openai' : 'google';
        ({ data, error } = await tryInvoke(fallbackProvider));
        if (error) throw error;
      }
      const mime = data?.mime || 'audio/mpeg';
      const base64 = data?.audio as string;
      if (!base64) return;
      const audio = new Audio(`data:${mime};base64,${base64}`);
      await audio.play().catch(() => console.warn('Lecture auto bloquée par le navigateur'));
    } catch (err) {
      console.error('TTS playback error', err);
    }
  };

  // TTS: synthétiser et télécharger sans l’ajouter dans le flux
  const synthesizeAndDownload = async (text: string) => {
    const tryInvoke = async (provider: 'openai' | 'google') => {
      const fn = provider === 'google' ? 'google-tts' : 'text-to-voice';
      const lang = (ttsVoice && ttsVoice.includes('-')) ? ttsVoice.split('-').slice(0,2).join('-') : 'fr-FR';
      const body = provider === 'google'
        ? { text, languageCode: lang, voiceName: ttsVoice || undefined, ssmlGender: 'NEUTRAL', audioEncoding: 'MP3' }
        : { text, voice: ttsVoice || 'alloy', format: 'mp3' };
      return await supabase.functions.invoke(fn, { body });
    };
    try {
      if (!text || /^data:/.test(text)) return;
      let { data, error } = await tryInvoke(ttsProvider);
      if (error) {
        const fallbackProvider = ttsProvider === 'google' ? 'openai' : 'google';
        ({ data, error } = await tryInvoke(fallbackProvider));
        if (error) throw error;
      }
      const mime = data?.mime || 'audio/mpeg';
      const base64 = data?.audio as string;
      if (!base64) return;
      const a = document.createElement('a');
      a.href = `data:${mime};base64,${base64}`;
      a.download = `tts-${Date.now()}.${mime.includes('wav') ? 'wav' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('TTS download error', err);
    }
  };

  // Charger la dernière conversation (30 jours)
  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id as string;
      if (!id) return;
      setCurrentConversationId(id);
      // Charger messages pour cette conversation
      (async () => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, content, role, created_at, model')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true });
        if (msgs) {
          setMessages(msgs.map((m: any) => ({
            id: m.id as string,
            content: m.content as string,
            role: m.role as 'user' | 'assistant',
            timestamp: new Date(m.created_at as string),
            model: m.model as string | undefined,
          }))
          );
        } else {
          setMessages([]);
        }
      })();
    };
    window.addEventListener('chat:select-conversation', handler);
    return () => window.removeEventListener('chat:select-conversation', handler);
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
        if (!user) {
          // En mode landing, déclencher le popup d'auth au lieu d'échouer
          if (isLandingMode && onAuthRequired) {
            setMessages(prev => prev.slice(0, -1)); // Retirer le message utilisateur ajouté
            setIsLoading(false); // Réinitialiser le loading
            onAuthRequired();
            return;
          }
          throw new Error('Non authentifié');
        }
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
      const { data: inserted, error: insertErr } = await supabase.from('messages').insert({
        conversation_id: convoId,
        role: 'user',
        content,
        model: selectedModel
      }).select('id').maybeSingle();
      if (insertErr) throw insertErr;
      const insertedMessageId = inserted?.id as string | undefined;

      // Embed and store user message for retrieval
      try {
        const { data: embedRes, error: embedErr } = await supabase.functions.invoke('openai-embed', { body: { input: [content] } });
        if (embedErr) throw embedErr;
        const vec = embedRes?.embeddings?.[0];
        const { data: { user } } = await supabase.auth.getUser();
        if (Array.isArray(vec) && user?.id) {
          await (supabase as any).from('embeddings').insert({
            conversation_id: convoId,
            message_id: insertedMessageId,
            user_id: user.id,
            content,
            embedding: vec as any,
          });
        }
      } catch (e) {
        console.warn('Embedding store failed', e);
      }

      // Mettre à jour le titre de la conversation si vide / placeholder
      try {
        const firstLine = String(content).split('\n')[0].trim();
        const candidate = firstLine ? firstLine.slice(0, 80) : 'Conversation';
        const { data: convRow } = await supabase
          .from('conversations')
          .select('id, title')
          .eq('id', convoId)
          .maybeSingle();
        const needsTitle = !convRow?.title || convRow.title === 'Nouvelle conversation';
        if (needsTitle && candidate) {
          await supabase.from('conversations').update({ title: candidate }).eq('id', convoId);
          window.dispatchEvent(new CustomEvent('chat:reload-conversations'));
        }
      } catch (e) {
        console.warn('Maj titre conversation échouée', e);
      }

      // Si upload (data URL), gérer image/PDF
      if (typeof content === 'string' && content.startsWith('data:')) {
        // Fichier attaché: on attend une instruction utilisateur avant d'analyser
        return;
      }

      // Déclenchement prioritaire: génération d'image si le message le demande
      const isUpload = typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'));
      const wantsImage = !isUpload && /(\bimage\b|\bphoto\b|\bpicture\b|\billustration\b|dessin|génère une image|genere une image|générer une image|crée une image|create an image|generate an image|logo|affiche)/i.test(content);
      if (wantsImage) {
        const { data, error } = await supabase.functions.invoke('dalle-image', {
          body: { prompt: content, size: '1024x1024' }
        });
        if (error) throw error;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data?.image || "Échec de génération d'image.",
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

      // Si un fichier a été ajouté récemment, utiliser le prompt textuel pour l'analyser maintenant
      const attachment = [...messages].reverse().find(m => typeof m.content === 'string' && (m.content as string).startsWith('data:'));
      if (attachment && typeof content === 'string' && !content.startsWith('data:')) {
        const att = attachment.content as string;
        const mimeAtt = att.slice(5, att.indexOf(';'));
        if (mimeAtt.startsWith('image/')) {
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
        } else if (mimeAtt === 'application/pdf' || mimeAtt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
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
      // Commandes TTS: /tts <texte>
      const ttsMatch = content.trim().match(/^\/tts\s+([\s\S]+)/i);
      if (ttsMatch) {
        const textToSpeak = ttsMatch[1].trim();
        const fn = ttsProvider === 'google' ? 'google-tts' : 'text-to-voice';
        const lang = (ttsVoice && ttsVoice.includes('-')) ? ttsVoice.split('-').slice(0,2).join('-') : 'fr-FR';
        const body = ttsProvider === 'google'
          ? { text: textToSpeak, languageCode: lang, voiceName: ttsVoice || undefined, ssmlGender: 'NEUTRAL', audioEncoding: 'MP3' }
          : { text: textToSpeak, voice: ttsVoice || 'alloy', format: 'mp3' };
        const { data, error } = await supabase.functions.invoke(fn, { body });
        if (error) throw error;
        const mime = data?.mime || 'audio/mpeg';
        const base64 = data?.audio as string;
        const dataUrl = `data:${mime};base64,${base64}`;
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

      // Commandes de génération de documents: /pdf, /docx, /pptx, /slide
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
          conversation_id: convoId,
          role: 'assistant',
          content: assistantMessage.content,
          model: selectedModel
        });
        return;
      }

      // Historique de messages pour le provider
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      // RAG: récupérer du contexte pertinent via embeddings
      let retrieved = '';
      try {
        const { data: qemb } = await supabase.functions.invoke('openai-embed', { body: { input: [content] } });
        const qvec = qemb?.embeddings?.[0];
        if (Array.isArray(qvec)) {
          const { data: hits } = await (supabase as any).rpc('match_embeddings', {
            query_embedding: qvec,
            conv_id: convoId,
            match_count: 5,
          });
          if (Array.isArray(hits) && hits.length) {
            retrieved = hits.map((h: any) => h.content).join('\n---\n');
          }
        }
      } catch (e) { console.warn('RAG retrieval failed', e); }

      const baseSystemCore = systemPrompt || 'You are Chatelix, a helpful multilingual assistant.';
      const baseSystem = retrieved ? `${baseSystemCore}\n\nContexte pertinent:\n${retrieved}` : baseSystemCore;
      const safeAddendum = ' Réponds avec prudence, vérifie les faits, cite tes limites et si tu n\'es pas sûr, dis que tu ne sais pas.';
      const sys = safeMode ? (baseSystem + safeAddendum) : baseSystem;
      const chatMessages = [
        { role: 'system', content: sys },
        ...history,
        { role: 'user', content }
      ];

      // Normalisation du modèle côté front pour correspondre aux fonctions backend disponibles
      let functionName: 'openai-chat' | 'perplexity-chat' | 'deepseek-chat' = 'openai-chat';
      let model = 'gpt-4o-mini'; // modèle supporté par openai-chat (chat/completions)

      // Adapter selon la sélection de l'utilisateur sans casser la compatibilité backend
      if (selectedModel === 'auto-router') {
        const text = content.toLowerCase();
        const len = content.length;
        const wantsWeb = /\b(actualité|news|web|recherche|internet|http|www|google|source|récent|update)\b/.test(text);
        const hardTask = len > 600 || /(analyse|preuve|démonstration|math|optimiser|refactor|architecture|raisonne|reason|long)/i.test(content);
        if (wantsWeb) {
          functionName = 'perplexity-chat';
          model = 'llama-3.1-sonar-small-128k-online';
        } else if (hardTask) {
          functionName = 'deepseek-chat';
          model = 'deepseek-chat';
        } else {
          functionName = 'openai-chat';
          model = 'gpt-4o-mini';
        }
      } else if (selectedModel === 'gpt-4.1') {
        model = 'gpt-4o-mini';
      } else if (selectedModel.includes('perplexity')) {
        functionName = 'perplexity-chat';
        model = 'llama-3.1-sonar-small-128k-online';
      } else if (selectedModel.includes('deepseek')) {
        functionName = 'deepseek-chat';
        model = 'deepseek-chat';
      }

      // Streaming pour OpenAI
      if (functionName === 'openai-chat') {
        const SUPABASE_URL = "https://jeurznrjcohqbevrzses.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXJ6bnJqY29ocWJldnJ6c2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MDAyMTgsImV4cCI6MjA3MDI3NjIxOH0.0lLgSsxohxeWN3d4ZKmlNiMyGDj2L7K8XRAwMq9zaaI";
        const url = `${SUPABASE_URL}/functions/v1/openai-chat-stream`;

        // Message assistant provisoire pour le stream
        let streamingId = `stream-${Date.now()}`;
        setMessages(prev => [...prev, { id: streamingId, content: '', role: 'assistant', timestamp: new Date(), model: selectedModel }]);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ messages: chatMessages, model, temperature: (safeMode ? 0.2 : 0.5), max_tokens: 400 })
        });

        if (!res.ok || !res.body) throw new Error(`Stream init failed: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let acc = '';
        setIsLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';
          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('data:')) {
              const json = trimmed.slice(5).trim();
              if (json === '[DONE]') {
                buffer = '';
                break;
              }
              try {
                const data = JSON.parse(json);
                const delta = data?.choices?.[0]?.delta?.content || '';
                if (delta) {
                  acc += delta;
                  setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, content: acc } : m));
                }
              } catch {}
            }
          }
        }

        // Final: insert et remplacement du message stream
        const finalAssistant: Message = {
          id: (Date.now() + 1).toString(),
          content: acc || 'Aucune réponse.',
          role: 'assistant',
          timestamp: new Date(),
          model: selectedModel,
        };
        setMessages(prev => prev.map(m => m.id === streamingId ? finalAssistant : m));
        await supabase.from('messages').insert({
          conversation_id: convoId,
          role: 'assistant',
          content: finalAssistant.content,
          model: selectedModel
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          messages: chatMessages,
          model,
          temperature: (safeMode ? 0.2 : 0.5),
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
            <ChatMessage key={message.id} message={message} onSpeak={synthesizeAndPlay} onDownloadTts={synthesizeAndDownload} />
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
          <Button size="sm" onClick={createNewConversation}>Nouveau chat</Button>
          <span className="text-xs text-muted-foreground ml-2">Exporter le dernier contenu:</span>
          <Button variant="secondary" size="sm" onClick={() => exportDocument('pdf')}>PDF</Button>
          <Button variant="secondary" size="sm" onClick={() => exportDocument('docx')}>DOCX</Button>
          <Button variant="secondary" size="sm" onClick={() => exportDocument('pptx')}>PPTX</Button>
        </div>
      </div>
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} sttProvider={sttProvider} />
    </div>
  );
};