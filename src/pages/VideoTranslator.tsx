import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Youtube, 
  Languages, 
  Volume2, 
  FileText, 
  Play, 
  Pause,
  Download, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mic,
  MicOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { RealTimeTranscriptionService } from "@/services/realTimeTranscriptionService";
import YouTube from 'react-youtube';

const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  translatedText?: string;
  audioUrl?: string;
}

export default function VideoTranslator() {
  const { toast } = useToast();
  const playerRef = useRef<any>(null);
  const transcriptionServiceRef = useRef<RealTimeTranscriptionService | null>(null);
  
  const { videoId, extractVideoId, setVideoId } = useYouTubePlayer();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("fr");
  const [generateVoiceover, setGenerateVoiceover] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const [originalSegments, setOriginalSegments] = useState<TranscriptionSegment[]>([]);
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptionSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<TranscriptionSegment | null>(null);

  const handleUrlValidation = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    if (handleUrlValidation(url)) {
      const id = extractVideoId(url);
      setVideoId(id);
    } else {
      setVideoId(null);
    }
  };

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
  };

  const startListening = async () => {
    if (!playerRef.current || !isPlayerReady) {
      toast({
        title: "Player non prêt",
        description: "Veuillez attendre que la vidéo soit chargée",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the video element from YouTube player
      const iframe = playerRef.current.getIframe();
      const audioElement = iframe.contentDocument?.querySelector('video') || 
                          iframe.contentWindow?.document?.querySelector('video');

      if (!audioElement) {
        toast({
          title: "Erreur d'accès audio",
          description: "Impossible d'accéder à l'audio de la vidéo",
          variant: "destructive"
        });
        return;
      }

      transcriptionServiceRef.current = new RealTimeTranscriptionService();
      await transcriptionServiceRef.current.startCapturingFromElement(audioElement);
      
      setIsListening(true);
      playerRef.current.playVideo();

      toast({
        title: "Écoute démarrée",
        description: "La transcription en temps réel est activée"
      });

    } catch (error: any) {
      console.error('Error starting listening:', error);
      toast({
        title: "Erreur d'écoute",
        description: error.message || "Impossible de démarrer l'écoute",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stop();
      transcriptionServiceRef.current = null;
    }
    setIsListening(false);
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
    
    toast({
      title: "Écoute arrêtée",
      description: "La transcription en temps réel a été désactivée"
    });
  };

  // Listen for real-time transcription segments
  useEffect(() => {
    const handleTranscriptionSegment = async (event: CustomEvent) => {
      const segment = event.detail as TranscriptionSegment;
      setOriginalSegments(prev => [...prev, segment]);
      setCurrentSegment(segment);

      // Translate segment if target language is different
      if (targetLang !== sourceLang && targetLang !== 'auto') {
        try {
          const translatedText = await RealTimeTranscriptionService.translateText(
            segment.text,
            sourceLang === 'auto' ? 'fr' : sourceLang,
            targetLang
          );

          let audioUrl: string | null = null;
          if (generateVoiceover) {
            audioUrl = await RealTimeTranscriptionService.generateVoiceSegment(
              translatedText,
              targetLang
            );
          }

          const translatedSegment: TranscriptionSegment = {
            ...segment,
            translatedText,
            audioUrl: audioUrl || undefined
          };

          setTranslatedSegments(prev => [...prev, translatedSegment]);
        } catch (error) {
          console.error('Translation error:', error);
        }
      }
    };

    window.addEventListener('transcription-segment', handleTranscriptionSegment as EventListener);
    
    return () => {
      window.removeEventListener('transcription-segment', handleTranscriptionSegment as EventListener);
    };
  }, [targetLang, sourceLang, generateVoiceover]);

  const downloadTranscription = () => {
    const originalText = originalSegments.map(s => s.text).join(' ');
    const translatedText = translatedSegments.map(s => s.translatedText || s.text).join(' ');
    
    const content = `Vidéo YouTube: ${youtubeUrl}\n\nTexte original:\n${originalText}\n\nTraduction (${targetLang}):\n${translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-youtube-${targetLang}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageByCode = (code: string) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Youtube className="w-8 h-8 text-destructive" />
            <Languages className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Traducteur Vidéo YouTube en Temps Réel</h1>
          <p className="text-muted-foreground">
            Écoutez, transcrivez et traduisez vos vidéos YouTube en temps réel
          </p>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Youtube className="w-5 h-5" />
              <span>Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* YouTube URL */}
            <div className="space-y-2">
              <Label htmlFor="youtube-url">URL YouTube</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={youtubeUrl && !handleUrlValidation(youtubeUrl) ? "border-destructive" : ""}
              />
              {youtubeUrl && !handleUrlValidation(youtubeUrl) && (
                <p className="text-sm text-destructive flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Format d'URL YouTube invalide</span>
                </p>
              )}
            </div>

            {/* Language Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Langue source</Label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">🌐 Détection automatique</SelectItem>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Langue cible</Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2 p-4 bg-secondary/50 rounded-lg">
              <Switch
                id="voiceover"
                checked={generateVoiceover}
                onCheckedChange={setGenerateVoiceover}
              />
              <Label htmlFor="voiceover" className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <span>Générer la voix off en temps réel</span>
              </Label>
              <Badge variant="secondary">Premium</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main Interface - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Column */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Youtube className="w-5 h-5" />
                  <span>Vidéo</span>
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    disabled={!videoId || !isPlayerReady}
                    variant={isListening ? "destructive" : "default"}
                    size="sm"
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Arrêter
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Écouter
                      </>
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videoId ? (
                <div className="aspect-video">
                  <YouTube
                    videoId={videoId}
                    onReady={onPlayerReady}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: {
                        autoplay: 0,
                        controls: 1,
                        modestbranding: 1
                      }
                    }}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-secondary/50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Youtube className="w-12 h-12 mx-auto mb-2" />
                    <p>Entrez une URL YouTube pour voir la vidéo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original Text Column */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Texte Original</span>
                <Badge variant="outline">
                  {getLanguageByCode(sourceLang === 'auto' ? 'fr' : sourceLang)?.flag} 
                  {getLanguageByCode(sourceLang === 'auto' ? 'fr' : sourceLang)?.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {originalSegments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Démarrez l'écoute pour voir la transcription en temps réel
                  </p>
                ) : (
                  originalSegments.map((segment, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg text-sm ${
                        currentSegment === segment 
                          ? 'bg-primary/20 border border-primary/30' 
                          : 'bg-secondary/30'
                      }`}
                    >
                      {segment.text}
                    </div>
                  ))
                )}
                {isListening && (
                  <div className="flex items-center space-x-2 p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Écoute en cours...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Translated Text Column */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Languages className="w-5 h-5" />
                <span>Traduction</span>
                <Badge variant="default">
                  {getLanguageByCode(targetLang)?.flag} {getLanguageByCode(targetLang)?.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {translatedSegments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    La traduction apparaîtra ici en temps réel
                  </p>
                ) : (
                  translatedSegments.map((segment, index) => (
                    <div key={index} className="space-y-2">
                      <div className="p-2 rounded-lg text-sm bg-primary/10 border border-primary/20">
                        {segment.translatedText || segment.text}
                      </div>
                      {segment.audioUrl && (
                        <audio controls className="w-full h-8">
                          <source src={segment.audioUrl} type="audio/mpeg" />
                        </audio>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Download Actions */}
        {originalSegments.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={downloadTranscription}>
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger la transcription
                </Button>
                {translatedSegments.some(s => s.audioUrl) && (
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger toutes les voix off
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}