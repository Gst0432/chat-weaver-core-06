import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { 
  Video, 
  Download,
  Lock,
  Upload,
  Play,
  History
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { klingAIService, KlingVideoParams } from "@/services/klingAIService";
import { supabase } from "@/integrations/supabase/client";
import { useQuota } from "@/hooks/useQuota";
import { useVideoHistory } from "@/hooks/useVideoHistory";
import { VideoHistory } from "@/components/VideoHistory";

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

export const VideoGenerator = ({ onVideoGenerated }: VideoGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [initImage, setInitImage] = useState<string | null>(null);
  const [duration, setDuration] = useState(5);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [selectedModel, setSelectedModel] = useState("klingai:5@3");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [showHistory, setShowHistory] = useState(true); // Show history by default
  const { canGenerate, isTestMode, incrementUsage } = useQuota();
  const { history, loading: historyLoading, saveToHistory, deleteFromHistory } = useVideoHistory();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInitImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getVideoDimensions = () => {
    switch (aspectRatio) {
      case "16:9": return { width: 1920, height: 1080 };
      case "1:1": return { width: 1080, height: 1080 };
      case "9:16": return { width: 1080, height: 1920 };
      default: return { width: 1920, height: 1080 };
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim() || prompt.length < 2) {
      toast({
        title: "Prompt requis",
        description: "Veuillez décrire la vidéo que vous voulez générer (2-2500 caractères).",
        variant: "destructive"
      });
      return;
    }

    if (prompt.length > 2500) {
      toast({
        title: "Prompt trop long",
        description: "Le prompt ne peut pas dépasser 2500 caractères.",
        variant: "destructive"
      });
      return;
    }

    if (negativePrompt.length > 0 && (negativePrompt.length < 2 || negativePrompt.length > 2500)) {
      toast({
        title: "Prompt négatif invalide",
        description: "Le prompt négatif doit contenir entre 2 et 2500 caractères.",
        variant: "destructive"
      });
      return;
    }

    if (!canGenerate) {
      toast({
        title: "Quota épuisé",
        description: "Vous avez atteint votre limite de générations gratuites.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { width, height } = getVideoDimensions();
      const aspectRatio = width === height ? '1:1' : width > height ? '16:9' : '9:16';
      
      const params: KlingVideoParams = {
        mode: initImage ? 'image-to-video' : 'text-to-video',
        prompt,
        negativePrompt: negativePrompt.trim() || undefined,
        duration: duration as 5 | 10,
        aspectRatio,
        imageUrl: initImage
      };

      console.log("🎬 Génération vidéo avec paramètres:", params);
      
      const result = await klingAIService.generateVideo(params);
      
      console.log("🎬 Réponse KlingAI:", result);
      
      // Pour KlingAI, on attend le taskId et on poll pour le statut
      const videoUrl = result.videoUrl;
      
      if (!videoUrl) {
        throw new Error("URL de vidéo non trouvée dans la réponse");
      }
      
      setGeneratedVideo(videoUrl);
      onVideoGenerated?.(videoUrl);
      
      // Save to history only if we have a valid video URL
      await saveToHistory({
        prompt,
        negative_prompt: negativePrompt.trim() || undefined,
        model: selectedModel,
        duration,
        cfg_scale: cfgScale,
        aspect_ratio: aspectRatio,
        video_url: videoUrl,
      });
      
      // Increment usage for free users
      if (isTestMode) {
        await incrementUsage();
      }
      
      toast({
        title: "Vidéo générée !",
        description: `Vidéo de ${duration}s générée avec succès`
      });
      
      
      
    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Erreur de génération",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la génération de la vidéo.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (generatedVideo) {
      const link = document.createElement('a');
      link.href = generatedVideo;
      link.download = 'video-runware.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReplayFromHistory = (item: any) => {
    setPrompt(item.prompt);
    setNegativePrompt(item.negative_prompt || '');
    setDuration(item.duration);
    setCfgScale(item.cfg_scale);
    setAspectRatio(item.aspect_ratio);
    setGeneratedVideo(item.video_url);
    setShowHistory(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Générateur de Vidéo KlingAI 2.1 Master
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {history.length} vidéo{history.length > 1 ? 's' : ''} générée{history.length > 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                {showHistory ? 'Masquer' : 'Afficher'} l'historique
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-prompt">Description de la vidéo (2-2500 caractères)</Label>
            <Textarea
              id="video-prompt"
              placeholder="Décrivez la vidéo que vous voulez générer..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] mt-2"
              disabled={isGenerating}
            />
            <div className="text-sm text-muted-foreground mt-1">
              {prompt.length}/2500 caractères
            </div>
          </div>

          <div>
            <Label htmlFor="negative-prompt">Prompt négatif (optionnel, 2-2500 caractères)</Label>
            <Textarea
              id="negative-prompt"
              placeholder="Décrivez ce que vous ne voulez pas voir dans la vidéo..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="min-h-[80px] mt-2"
              disabled={isGenerating}
            />
            <div className="text-sm text-muted-foreground mt-1">
              {negativePrompt.length}/2500 caractères
            </div>
          </div>

          <div>
            <Label htmlFor="model">Modèle de génération</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="klingai:5@3">KlingAI 2.1 Master (Recommandé)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="aspect-ratio">Format vidéo</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 - Paysage (1920×1080)</SelectItem>
                <SelectItem value="1:1">1:1 - Carré (1080×1080)</SelectItem>
                <SelectItem value="9:16">9:16 - Portrait (1080×1920)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Durée (secondes)</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseFloat(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 secondes</SelectItem>
                  <SelectItem value="10">10 secondes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cfg-scale">CFG Scale (0-1)</Label>
              <Input
                id="cfg-scale"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={cfgScale}
                onChange={(e) => setCfgScale(parseFloat(e.target.value) || 0.5)}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="init-image">Image de départ (optionnel)</Label>
            <div className="mt-2 space-y-2">
              <Input
                id="init-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isGenerating}
              />
              {initImage && (
                <div className="relative">
                  <img 
                    src={initImage} 
                    alt="Image de départ" 
                    className="w-32 h-32 object-cover rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setInitImage(null)}
                    className="absolute -top-2 -right-2"
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={generateVideo}
            disabled={isGenerating || !prompt.trim() || !canGenerate}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Génération en cours...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                {canGenerate ? "Générer la vidéo" : "Quota épuisé"}
              </>
            )}
          </Button>

          {isTestMode && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md text-sm text-amber-800">
              <Lock className="w-4 h-4" />
              Mode test : Téléchargement limité. Passez au Premium pour télécharger vos vidéos.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Always show history section, but collapsible */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <CollapsibleContent>
          <VideoHistory
            history={history}
            loading={historyLoading}
            onDelete={deleteFromHistory}
            onReplay={handleReplayFromHistory}
          />
        </CollapsibleContent>
      </Collapsible>

      {generatedVideo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Vidéo générée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <video 
              src={generatedVideo} 
              controls 
              className="w-full max-w-md mx-auto rounded border"
              autoPlay
              loop
              onError={(e) => {
                console.error('Video load error:', e);
                toast({
                  title: "Erreur",
                  description: "Impossible de charger la vidéo (URL expirée)",
                  variant: "destructive",
                });
              }}
            />
            
            <div className="flex gap-2">
              {isTestMode ? (
                <Button disabled variant="outline" className="opacity-50">
                  <Lock className="w-4 h-4 mr-2" />
                  Télécharger (Premium)
                </Button>
              ) : (
                <Button onClick={downloadVideo} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};