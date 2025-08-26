import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Play, Download, Loader2, Video, Image, Wand2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { klingAIService, KlingVideoParams, KlingVideoResult } from "@/services/klingAIService";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedVideo {
  videoUrl: string;
  taskId: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export const KlingAIVideoGenerator = () => {
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [duration, setDuration] = useState<5 | 10>(10);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll task status when generating
  useEffect(() => {
    if (!currentTask || !isGenerating) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await klingAIService.checkTaskStatus(currentTask);
        
        if (result.status === 'completed' && result.videoUrl) {
          const newVideo: GeneratedVideo = {
            videoUrl: result.videoUrl,
            taskId: currentTask,
            prompt,
            duration,
            aspectRatio,
            status: 'completed'
          };

          setGeneratedVideos(prev => [newVideo, ...prev]);
          setIsGenerating(false);
          setCurrentTask(null);
          setEstimatedTime(null);
          
          toast({
            title: "Vidéo générée !",
            description: "Votre vidéo KlingAI est prête"
          });
          
          clearInterval(pollInterval);
        } else if (result.status === 'failed') {
          setIsGenerating(false);
          setCurrentTask(null);
          setEstimatedTime(null);
          
          toast({
            title: "Erreur de génération",
            description: result.errorMessage || "La génération a échoué",
            variant: "destructive"
          });
          
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Erreur poll status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [currentTask, isGenerating, prompt, duration, aspectRatio]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 20MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Upload vers Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (error) throw error;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      
      toast({
        title: "Image uploadée",
        description: "Image prête pour la génération vidéo"
      });
    } catch (error) {
      console.error('Erreur upload:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader l'image",
        variant: "destructive"
      });
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Veuillez entrer une description pour votre vidéo",
        variant: "destructive"
      });
      return;
    }

    if (mode === 'image-to-video' && !uploadedImageUrl) {
      toast({
        title: "Image requise",
        description: "Veuillez uploader une image pour la génération image-to-video",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const params: KlingVideoParams = {
        mode,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        duration,
        aspectRatio,
        imageUrl: mode === 'image-to-video' ? uploadedImageUrl : undefined
      };

      console.log('Génération vidéo avec params:', params);

      const result = await klingAIService.generateVideo(params);
      
      setCurrentTask(result.taskId);
      setEstimatedTime(result.estimatedTime || 120);
      
      toast({
        title: "Génération lancée !",
        description: `Temps estimé: ${Math.ceil((result.estimatedTime || 120) / 60)} minutes`
      });

    } catch (error: any) {
      console.error('Erreur génération vidéo:', error);
      setIsGenerating(false);
      setCurrentTask(null);
      setEstimatedTime(null);
      
      toast({
        title: "Erreur de génération",
        description: error.message || "Impossible de générer la vidéo",
        variant: "destructive"
      });
    }
  };

  const downloadVideo = async (videoUrl: string, videoPrompt: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `klingai-video-${videoPrompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Téléchargement lancé",
        description: "La vidéo est en cours de téléchargement"
      });
    } catch (error) {
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger la vidéo",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <Video className="w-8 h-8 text-primary" />
          KlingAI Officiel
        </h1>
        <p className="text-muted-foreground">
          Générateur de vidéos AI officiel • Haute qualité • API KlingAI
        </p>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          🎬 API Officielle KlingAI v1
        </Badge>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex justify-center">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={mode === 'text-to-video' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('text-to-video')}
                className="flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Text-to-Video
              </Button>
              <Button
                variant={mode === 'image-to-video' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('image-to-video')}
                className="flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                Image-to-Video
              </Button>
            </div>
          </div>

          {/* Image Upload pour Image-to-Video */}
          {mode === 'image-to-video' && (
            <Card className="p-4 border-dashed border-2">
              <div className="text-center space-y-4">
                {uploadedImageUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={uploadedImageUrl} 
                      alt="Image uploadée" 
                      className="max-w-xs mx-auto rounded-lg shadow-md"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Changer d'image
                    </Button>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Uploadez une image (300-2048px, max 20MB)
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir une image
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </Card>
          )}

          {/* Prompt Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description de la vidéo (2-2500 caractères)
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez votre vidéo... Ex: Prise de vue cinématographique aérienne des vagues s'écrasant contre des falaises dramatiques pendant l'heure dorée"
                className="min-h-[100px] resize-none"
                maxLength={2500}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {prompt.length}/2500 caractères
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Prompt négatif (optionnel)
              </label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Ce que vous ne voulez pas voir... Ex: flou, basse qualité, déformé"
                className="min-h-[60px] resize-none"
                maxLength={2500}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Durée
              </label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value) as 5 | 10)}>
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
              <label className="text-sm font-medium text-foreground mb-2 block">
                Format vidéo
              </label>
              <Select value={aspectRatio} onValueChange={(value: '16:9' | '1:1' | '9:16') => setAspectRatio(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 - Paysage</SelectItem>
                  <SelectItem value="1:1">1:1 - Carré</SelectItem>
                  <SelectItem value="9:16">9:16 - Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateVideo}
            disabled={isGenerating || !prompt.trim() || (mode === 'image-to-video' && !uploadedImageUrl)}
            className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {estimatedTime && (
                  <span className="text-sm mr-2">
                    ~{Math.ceil(estimatedTime / 60)}min
                  </span>
                )}
                Génération en cours...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Générer Vidéo KlingAI
              </>
            )}
          </Button>

          {/* Progress indicator */}
          {isGenerating && currentTask && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Génération en cours - ID: {currentTask.slice(0, 8)}...
              </div>
              {estimatedTime && (
                <p className="text-xs text-muted-foreground">
                  Temps estimé: {Math.ceil(estimatedTime / 60)} minutes
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Generated Videos */}
      {generatedVideos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Vidéos générées
          </h3>
          <div className="grid gap-4">
            {generatedVideos.map((video, index) => (
              <Card key={video.taskId} className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <video
                      controls
                      className="w-full max-w-md rounded-lg shadow-md"
                      poster="/placeholder.svg"
                    >
                      <source src={video.videoUrl} type="video/mp4" />
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{video.duration}s</Badge>
                      <Badge variant="outline">{klingAIService.getAspectRatioDisplay(video.aspectRatio)}</Badge>
                      <Badge variant="outline" className={
                        video.status === 'completed' ? 'bg-green-100 text-green-800' :
                        video.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {video.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {video.prompt}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadVideo(video.videoUrl, video.prompt)}
                      className="w-full"
                      disabled={video.status !== 'completed'}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger MP4
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};