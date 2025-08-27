import { useEffect, useState, useRef } from "react";
import { Document as DocxDocument, Packer, Paragraph } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ImageControls } from "./ImageControls";
import { ModelStatusIndicator } from "./ModelStatusIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { ModelRouterService } from '@/services/modelRouterService';
import { PromptEngineerService } from '@/services/promptEngineerService';
import { aiService } from '@/services/aiService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageService } from "@/services/imageService";
import { TextToSpeechService } from "@/services/textToSpeechService";

import { OpenRouterService } from "@/services/openRouterService";
import { AppGeneratorService } from "@/services/appGeneratorService";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  model?: string;
}

const initialMessages: Message[] = [];

// Helper: Video request detection
const isVideoRequest = (message: string): boolean => {
  const videoKeywords = [
    'vidéo', 'video', 'film', 'clip', 'animation', 'séquence',
    'génère une vidéo', 'crée une vidéo', 'fais une vidéo',
    'video of', 'create video', 'generate video', 'make video'
  ];
  
  return videoKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
};

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
  systemPrompt?: string;
  safeMode?: boolean;
  isLandingMode?: boolean;
  onAuthRequired?: () => void;
  personality?: string;
}

export const ChatArea = ({ selectedModel, systemPrompt, safeMode, isLandingMode = false, onAuthRequired, personality = 'default' }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showImageControls, setShowImageControls] = useState(false);
  const [autoRouterChoice, setAutoRouterChoice] = useState<string>('');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

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

      // OPTIMISATION: Paralléliser tous les appels non-bloquants
      const { data: { user } } = await supabase.auth.getUser();
      
      const parallelTasks = [];
      
      // Tâche 1: Embedding (en arrière-plan)
      if (user?.id) {
        parallelTasks.push(
          supabase.functions.invoke('openai-embed', { body: { input: [content] } })
            .then(({ data: embedRes, error: embedErr }) => {
              if (!embedErr && embedRes?.embeddings?.[0]) {
                return (supabase as any).from('embeddings').insert({
                  conversation_id: convoId,
                  message_id: insertedMessageId,
                  user_id: user.id,
                  content,
                  embedding: embedRes.embeddings[0] as any,
                });
              }
            })
            .catch(e => console.warn('Embedding store failed', e))
        );
      }

      // Tâche 2: Mise à jour titre conversation (en arrière-plan)
      parallelTasks.push(
        (async () => {
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
        })()
      );

      // Exécuter toutes les tâches en parallèle SANS bloquer la génération
      Promise.all(parallelTasks).catch(e => console.warn('Background tasks failed:', e));

      // Si upload (data URL), gérer image/PDF
      if (typeof content === 'string' && content.startsWith('data:')) {
        // Fichier attaché: on attend une instruction utilisateur avant d'analyser
        return;
      }

      // Déclenchement prioritaire: génération d'image si le message le demande
      // Utilise automatiquement le meilleur provider disponible (Runware si configuré, sinon DALL-E)
      const isUpload = typeof content === 'string' && (content.startsWith('data:') || content.startsWith('http'));
      const wantsImage = !isUpload && ImageService.isImageRequest(content);
      const wantsVideo = !isUpload && isVideoRequest(content);
      const wantsApp = !isUpload && AppGeneratorService.isAppGenerationRequest(content);
      
      // Génération d'application complète
      if (wantsApp) {
        try {
          console.log("🏗️ Début génération application complète");
          
          const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            content: "🏗️ Génération de l'application en cours... Cela peut prendre quelques minutes.",
            role: "assistant",
            timestamp: new Date(),
            model: "app-generator"
          };
          setMessages(prev => [...prev, tempMessage]);

          const generatedApp = await AppGeneratorService.generateApp(content);
          
          // Supprimer le message temporaire
          setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
          
          // Créer le contenu web complet
          const webContent = `${generatedApp.html}\n<style>${generatedApp.css}</style>\n<script>${generatedApp.javascript}</script>`;
          
          const appMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: webContent,
            role: "assistant",
            timestamp: new Date(),
            model: "app-generator"
          };
          
          setMessages(prev => [...prev, appMessage]);
          
          // Sauvegarder dans la base
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: webContent,
            model: "app-generator"
          });
          
          toast({
            title: "Application générée !",
            description: "Votre application complète est prête.",
          });
          
          return; // Arrêter le traitement pour la génération d'app
        } catch (error) {
          console.error("❌ Erreur génération app:", error);
          
          // Supprimer le message temporaire en cas d'erreur
          setMessages(prev => prev.filter(m => m.id.startsWith('temp-')));
          
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: `Erreur génération application: ${error instanceof Error ? error.message : "Échec de la génération"}`,
            role: "assistant",
            timestamp: new Date(),
            model: "app-generator"
          };
          setMessages(prev => [...prev, errorMessage]);
          
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: errorMessage.content,
            model: "app-generator"
          });
          
          return;
        } finally {
          setIsLoading(false);
        }
      }

      // Génération d'image si le message la demande
      if (wantsImage) {
        console.log("🎨 Génération d'image détectée");
        try {
          const imageUrl = await ImageService.generateImage({ prompt: content, size: "1024x1024" });
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: imageUrl,
            role: "assistant",
            timestamp: new Date(),
            model: "image-generator"
          };
          setMessages(prev => [...prev, assistantMessage]);
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: imageUrl,
            model: "image-generator"
          });
          return;
        } catch (error) {
          console.error("❌ Erreur génération image:", error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `Erreur génération image: ${error instanceof Error ? error.message : "Échec de la génération"}`,
            role: "assistant",
            timestamp: new Date(),
            model: selectedModel
          };
          setMessages(prev => [...prev, errorMessage]);
          await supabase.from('messages').insert({
            conversation_id: convoId,
            role: 'assistant',
            content: errorMessage.content,
            model: selectedModel
          });
          return;
        } finally {
          setIsLoading(false);
        }
      }

      // Génération de vidéo si demandée
      if (wantsVideo) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "🎬 Pour générer des vidéos, utilisez le Générateur Vidéo accessible via le bouton dans le menu latéral. Il propose des modèles VEO2 et VEO3 avec des prompts optimisés pour la génération vidéo.",
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
        return;
      }

      // Commandes spéciales désormais gérées par pages dédiées
      if (content.startsWith('/tts')) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Les commandes TTS sont maintenant disponibles dans Studio TTS. Accédez-y via le menu latéral.",
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
        return;
      }

      // Commandes de documents
      const docMatch = content.trim().match(/^\/doc\s+(pdf|docx|pptx)\s+([\s\S]+)/i);
      if (docMatch) {
        const [, format, text] = docMatch;
        let dataUrl = '';
        if (format === 'pdf') {
          dataUrl = await createPdfDataUrl(text);
        } else if (format === 'docx') {
          dataUrl = await createDocxDataUrl(text);
        } else if (format === 'pptx') {
          dataUrl = await createPptxDataUrl(text);
        }
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: dataUrl,
          role: "assistant",
          timestamp: new Date(),
          model: selectedModel
        };
        setMessages(prev => [...prev, assistantMessage]);
        await supabase.from('messages').insert({
          conversation_id: convoId,
          role: 'assistant',
          content: dataUrl,
          model: selectedModel
        });
        return;
      }

      // Appel IA normal
      let actualModel = selectedModel;

      if (actualModel === 'auto-router') {
        console.log("🤖 Routage automatique activé");
        const length = content.length < 100 ? 'short' as const : content.length > 500 ? 'long' as const : 'medium' as const;
        const taskAnalysis = { type: 'general' as const, complexity: 'medium' as const, content, length };
        const bestModel = await ModelRouterService.selectBestModel(taskAnalysis);
        actualModel = bestModel;
        setAutoRouterChoice(bestModel);
        console.log(`🎯 Modèle sélectionné automatiquement: ${bestModel}`);
      }

      const systemMessage = systemPrompt || "Tu es un assistant utile et concis.";
      const result = await aiService.generateIntelligent(content, actualModel, personality);
      
      if (!result.text) {
        throw new Error("Aucune réponse reçue");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: result.text,
        role: "assistant",
        timestamp: new Date(),
        model: actualModel
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Sauvegarder la réponse dans la base
      await supabase.from('messages').insert({
        conversation_id: convoId,
        role: 'assistant',
        content: result.text,
        model: actualModel
      });

      // TTS functionality moved to dedicated TTS Studio page

    } catch (error) {
      console.error('Erreur envoi message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageGenerated = (imageUrl: string) => {
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: imageUrl,
      role: "assistant",
      timestamp: new Date(),
      model: "dalle-3"
    };
    setMessages(prev => [...prev, assistantMessage]);
  };

  // Fonctions TTS pour les boutons du chat
  const handleSpeak = async (text: string) => {
    try {
      const settings = {
        provider: 'openai',
        voice: 'alloy',
        language: 'fr',
        speed: 1.0,
        format: 'mp3'
      };
      
      await TextToSpeechService.playTextAudio(text, settings);
      
      toast({
        title: "Audio lu",
        description: "Le texte est en cours de lecture.",
      });
    } catch (error) {
      console.error('Erreur TTS:', error);
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le texte. Vérifiez vos quotas.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTts = async (text: string) => {
    try {
      const settings = {
        provider: 'openai',
        voice: 'alloy',
        language: 'fr',
        speed: 1.0,
        format: 'mp3'
      };
      
      const result = await TextToSpeechService.generateSpeech(text, settings);
      const audioBlob = TextToSpeechService.base64ToBlob(result.audioContent, result.mime);
      const url = URL.createObjectURL(audioBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Audio téléchargé",
        description: "Le fichier audio a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Erreur téléchargement TTS:', error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger l'audio. Vérifiez vos quotas.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 bg-background">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              onSpeak={handleSpeak}
              onDownloadTts={handleDownloadTts}
            />
          ))}
          {isLoading && (
            <>
              <ModelStatusIndicator 
                selectedModel={selectedModel}
                isLoading={isLoading}
                autoRouterChoice={autoRouterChoice}
              />
              <ChatMessage 
                key="loading"
                message={{
                  id: "loading",
                  content: "Génération en cours...",
                  role: "assistant",
                  timestamp: new Date(),
                  model: selectedModel
                }}
              />
            </>
          )}

          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <MessageSquare className="w-16 h-16 text-muted-foreground/50" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Commencez une nouvelle conversation
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Posez une question, demandez de l'aide, ou explorez les possibilités avec l'IA.
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>💡 Essayez: "Explique-moi comment..."</p>
                  <p>🎨 Ou: "Génère une image de..."</p>
                  <p>💻 Ou: "Crée une application..."</p>
                </div>
              </div>
            </div>
          )}
          {/* Invisible element for scrolling to bottom */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {showImageControls && (
        <div className="border-t border-border bg-card/50 p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🎨 Studio DALL-E - Génération d'Images IA
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Créez des images avec DALL-E 3, éditez avec DALL-E 2 ou générez des variations
            </p>
          </div>
          <ImageControls onImageGenerated={handleImageGenerated} />
        </div>
      )}
      
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} isLoading={isLoading} selectedModel={selectedModel} />
    </div>
  );
};