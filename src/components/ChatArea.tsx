import { useEffect, useState } from "react";
import { Document as DocxDocument, Packer, Paragraph } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ImageControls } from "./ImageControls";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageService } from "@/services/imageService";
import { useToast } from "@/hooks/use-toast";

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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = fontSize * 1.2;
  const margin = 50;
  
  let currentPage = pdfDoc.addPage();
  const { width, height } = currentPage.getSize();
  let y = height - margin;
  
  const lines = wrapText(text, Math.floor((width - 2 * margin) / (fontSize * 0.6)));
  
  lines.forEach((line) => {
    // Si on n'a plus de place sur la page, créer une nouvelle page
    if (y < margin + lineHeight) {
      currentPage = pdfDoc.addPage();
      y = height - margin;
    }
    
    currentPage.drawText(line || " ", { 
      x: margin, 
      y, 
      size: fontSize, 
      font,
      color: rgb(0, 0, 0)
    });
    y -= lineHeight;
  });
  
  return await pdfDoc.saveAsBase64({ dataUri: true });
};

const createDocxDataUrl = async (text: string) => {
  const doc = new DocxDocument({
    sections: [
      { 
        properties: {}, 
        children: text.split(/\r?\n/).map((line) => new Paragraph({
          text: line || " ",
          spacing: {
            after: 120,
          }
        }))
      },
    ],
  });
  const base64 = await Packer.toBase64String(doc);
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
};

const createPptxDataUrl = async (text: string) => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
  
  // Diviser le texte en slides si trop long
  const maxCharsPerSlide = 800;
  const textChunks = [];
  
  if (text.length <= maxCharsPerSlide) {
    textChunks.push(text);
  } else {
    const paragraphs = text.split('\n');
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxCharsPerSlide && currentChunk) {
        textChunks.push(currentChunk.trim());
        currentChunk = paragraph + '\n';
      } else {
        currentChunk += paragraph + '\n';
      }
    }
    
    if (currentChunk.trim()) {
      textChunks.push(currentChunk.trim());
    }
  }
  
  textChunks.forEach((chunk, index) => {
    const slide = pptx.addSlide();
    slide.addText(chunk, { 
      x: 0.5, 
      y: 1, 
      w: 9, 
      h: 5.5, 
      fontSize: 16,
      color: '000000',
      align: 'left',
      valign: 'top',
      wrap: true
    });
    
    if (textChunks.length > 1) {
      slide.addText(`${index + 1} / ${textChunks.length}`, {
        x: 8.5,
        y: 6.5,
        w: 1,
        h: 0.5,
        fontSize: 12,
        color: '666666'
      });
    }
  });
  
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
  const [showImageControls, setShowImageControls] = useState(false);
  const { toast } = useToast();

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
    const handleSelectConversation = (e: any) => {
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

    const handleNewConversation = () => {
      setCurrentConversationId(null);
      setMessages([]);
    };

    window.addEventListener('chat:select-conversation', handleSelectConversation);
    window.addEventListener('chat:new-conversation', handleNewConversation);
    
    return () => {
      window.removeEventListener('chat:select-conversation', handleSelectConversation);
      window.removeEventListener('chat:new-conversation', handleNewConversation);
    };
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
      // Utilise automatiquement le meilleur provider disponible (Runware si configuré, sinon DALL-E)
      const isUpload = typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'));
      const wantsImage = !isUpload && ImageService.isImageRequest(content);
      if (wantsImage) {
        // Initialiser Runware si pas déjà fait
        await ImageService.initRunware();
        
        try {
          const imageUrl = await ImageService.generateImage({
            prompt: content,
            size: '1024x1024',
            quality: 'hd'
            // Le service choisira automatiquement le meilleur provider
          });
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: imageUrl,
            role: 'assistant',
            timestamp: new Date(),
            model: 'ai-image' // Nom générique pour les images IA
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: assistantMessage.content,
            model: 'ai-image'
          });
          return;
        } catch (error) {
          console.error('Erreur génération d\'image:', error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `Échec de génération d'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            role: 'assistant',
            timestamp: new Date(),
            model: 'ai-image'
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
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

      // Debug: Afficher le modèle sélectionné
      console.log('🔍 DEBUG - selectedModel reçu:', selectedModel);

      // Adapter selon la sélection de l'utilisateur sans casser la compatibilité backend
      if (selectedModel === 'auto-router') {
        const text = content.toLowerCase();
        const len = content.length;
        const wantsWeb = /\b(actualité|actualités|news|web|recherche|internet|http|www|google|source|récent|update|temps réel|aujourd'hui|maintenant|2024|2025|prix|cours|bourse|météo|info|événement|que se passe|qu'est-ce qui|dernières nouvelles|breaking news|live|direct|current|latest)\b/.test(text);
        const isQuestion = /^(qui|que|quoi|où|quand|comment|pourquoi|combien|quel|quelle|est-ce que|what|when|where|how|why|which|who)/i.test(content.trim());
        const hardTask = len > 600 || /(analyse approfondie|preuve|démonstration|math complexe|optimiser|refactor|architecture|raisonne|reasoning|algorithmique|code review|debug complexe)/i.test(content);
        
        if (wantsWeb || (isQuestion && !hardTask)) {
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
        functionName = 'openai-chat';
        model = 'gpt-4o-mini';
      } else if (selectedModel === 'perplexity' || selectedModel.includes('perplexity')) {
        functionName = 'perplexity-chat';
        model = 'llama-3.1-sonar-small-128k-online';
        console.log('✅ PERPLEXITY sélectionné - functionName:', functionName, 'model:', model);
      } else if (selectedModel.includes('deepseek')) {
        functionName = 'deepseek-chat';
        model = 'deepseek-chat';
      } else {
        // Par défaut, utiliser OpenAI
        functionName = 'openai-chat';
        model = 'gpt-4o-mini';
      }

      console.log('📋 Résultat final - functionName:', functionName, 'model:', model);

      // Streaming uniquement pour OpenAI
      if (functionName === 'openai-chat') {
        const SUPABASE_URL = "https://jeurznrjcohqbevrzses.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXJ6bnJqY29ocWJldnJ6c2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MDAyMTgsImV4cCI6MjA3MDI3NjIxOH0.0lLgSsxohxeWN3d4ZKmlNiMyGDj2L7K8XRAwMq9zaaI";
        const url = `${SUPABASE_URL}/functions/v1/openai-chat-stream`;

        // Message assistant provisoire pour le stream
        let streamingId = `stream-${Date.now()}`;
        setMessages(prev => [...prev, { id: streamingId, content: '', role: 'assistant', timestamp: new Date(), model }]);

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
          model,
        };
        setMessages(prev => prev.map(m => m.id === streamingId ? finalAssistant : m));
        await supabase.from('messages').insert({
          conversation_id: convoId,
          role: 'assistant',
          content: finalAssistant.content,
          model
        });
        return;
      }

      console.log('🚀 Appel à la fonction:', functionName, 'avec modèle:', model);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          messages: chatMessages,
          model,
          temperature: (safeMode ? 0.2 : 0.5),
          max_tokens: 400
        }
      });

      console.log('📥 Réponse de', functionName, '- data:', data, 'error:', error);

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data?.generatedText || 'Aucune réponse.',
        role: "assistant",
        timestamp: new Date(),
        model
      };

      setMessages(prev => [...prev, assistantMessage]);

      await supabase.from('messages').insert({
        conversation_id: convoId,
        role: 'assistant',
        content: assistantMessage.content,
        model
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

  // Gestionnaire pour les images générées via ImageControls
  const handleImageGenerated = async (imageUrl: string, type: 'generation' | 'edit' | 'variation') => {
    const typeLabels = {
      generation: 'Génération DALL-E 3',
      edit: 'Édition DALL-E 2',
      variation: 'Variation DALL-E 2'
    };

    const assistantMessage: Message = {
      id: Date.now().toString(),
      content: imageUrl,
      role: 'assistant',
      timestamp: new Date(),
      model: type === 'generation' ? 'dall-e-3' : 'dall-e-2'
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Sauvegarder dans la base si on a une conversation active
    if (currentConversationId) {
      await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: imageUrl,
        model: assistantMessage.model
      });
    }

    toast({
      title: typeLabels[type],
      description: "Image créée avec succès"
    });
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

      // Téléchargement automatique
      const link = document.createElement('a');
      link.href = dataUrl;
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
      const extensions = { pdf: 'pdf', docx: 'docx', pptx: 'pptx' };
      link.download = `document-${timestamp}.${extensions[type]}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Optionnel : ajouter aussi le document dans le chat
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
    <div className="flex-1 flex flex-col h-full bg-background">
      <ScrollArea className="flex-1 p-4 bg-background">
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
      
      {/* Barre d'actions avec boutons optimisés mobile */}
      <div className="border-t border-border bg-background">
        <div className="max-w-4xl mx-auto px-3 py-3">
          {/* Ligne principale : Boutons d'actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-2">
            {/* Première ligne mobile : Nouveau chat + Studio DALL-E */}
            <div className="flex items-center gap-3 flex-1">
              <Button 
                variant="default" 
                size="sm" 
                onClick={createNewConversation}
                className="flex-1 sm:flex-none bg-gradient-primary hover:shadow-glow transition-all"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Nouveau chat</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
              
              <Button 
                onClick={() => setShowImageControls(!showImageControls)}
                variant={showImageControls ? "default" : "outline"}
                size="sm"
                className="flex-1 sm:flex-none font-medium transition-all duration-200 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:text-purple-800 hover:shadow-md"
              >
                <span className="hidden sm:inline">
                  {showImageControls ? '✕ Fermer Studio' : '🎨 Studio DALL-E'}
                </span>
                <span className="sm:hidden font-bold">
                  {showImageControls ? '✕' : '🎨 DALL-E'}
                </span>
              </Button>
            </div>
            
            
            {/* Section Export - Deuxième ligne sur mobile */}
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              <span className="text-xs text-muted-foreground hidden md:inline whitespace-nowrap">
                Exporter le dernier contenu:
              </span>
              <span className="text-xs text-muted-foreground md:hidden">
                Export:
              </span>
              
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportDocument('pdf')}
                  className="text-xs px-2 py-1 h-7 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
                >
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportDocument('docx')}
                  className="text-xs px-2 py-1 h-7 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  DOCX
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportDocument('pptx')}
                  className="text-xs px-2 py-1 h-7 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
                >
                  PPTX
                </Button>
              </div>
            </div>
          </div>
          
          {/* Indicateur du nombre de messages */}
          {messages.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {messages.length} message{messages.length > 1 ? 's' : ''} dans cette conversation
            </div>
          )}
        </div>
      </div>
      
      {/* Studio d'Images DALL-E - Repositionné avant ChatInput pour mobile */}
      {showImageControls && (
        <div className="border-t border-border bg-gradient-to-br from-purple-50/50 to-indigo-50/50 p-4 mx-auto max-w-4xl">
          <div className="mb-2 text-center">
            <h3 className="text-sm font-medium text-purple-800 flex items-center justify-center gap-2">
              🎨 Studio DALL-E - Génération d'Images IA
            </h3>
            <p className="text-xs text-purple-600 mt-1">
              Créez des images avec DALL-E 3, éditez avec DALL-E 2 ou générez des variations
            </p>
          </div>
          <ImageControls onImageGenerated={handleImageGenerated} />
        </div>
      )}
      
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} sttProvider={sttProvider} />
    </div>
  );
};