import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, 
  Download,
  Lock,
  Upload,
  Play
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RunwareService, GenerateVideoParams } from "@/services/runwareService";
import { supabase } from "@/integrations/supabase/client";
import { useQuota } from "@/hooks/useQuota";

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

export const VideoGenerator = ({ onVideoGenerated }: VideoGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [initImage, setInitImage] = useState<string | null>(null);
  const [duration, setDuration] = useState(3);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [selectedModel, setSelectedModel] = useState("klingai:5@3");
  const { canGenerate, isTestMode, incrementUsage } = useQuota();

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

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Veuillez décrire la vidéo que vous voulez générer.",
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
      // Get Runware API key
      const { data: keyData, error: keyError } = await supabase.functions.invoke('get-runware-key');
      
      if (keyError || !keyData?.apiKey) {
        throw new Error("Clé API Runware non configurée");
      }

      const runwareService = new RunwareService(keyData.apiKey);
      
      const params: GenerateVideoParams = {
        positivePrompt: prompt,
        model: selectedModel,
        duration,
        CFGScale: cfgScale,
        width: 768,
        height: 768,
        ...(initImage && { initImage })
      };

      console.log("🎬 Génération vidéo avec paramètres:", params);
      
      const result = await runwareService.generateVideo(params);
      
      setGeneratedVideo(result.videoURL);
      onVideoGenerated?.(result.videoURL);
      
      // Increment usage for free users
      if (isTestMode) {
        await incrementUsage();
      }
      
      toast({
        title: "Vidéo générée !",
        description: `Vidéo de ${duration}s générée avec succès`
      });
      
      runwareService.disconnect();
      
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Générateur de Vidéo Runware
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-prompt">Description de la vidéo</Label>
            <Textarea
              id="video-prompt"
              placeholder="Décrivez la vidéo que vous voulez générer..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] mt-2"
              disabled={isGenerating}
            />
          </div>

          <div>
            <Label htmlFor="model">Modèle de génération</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="klingai:5@3">KlingAI v5.3 (Recommandé)</SelectItem>
                <SelectItem value="klingai:5@2">KlingAI v5.2</SelectItem>
                <SelectItem value="klingai:4@1">KlingAI v4.1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Durée (secondes)</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 secondes</SelectItem>
                  <SelectItem value="5">5 secondes</SelectItem>
                  <SelectItem value="10">10 secondes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cfg-scale">CFG Scale (0.1-1.0)</Label>
              <Input
                id="cfg-scale"
                type="number"
                min="0.1"
                max="1.0"
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