import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Youtube, 
  Languages, 
  Volume2, 
  FileText, 
  Play, 
  Download, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoTranslationService } from "@/services/videoTranslationService";

const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

interface TranslationResult {
  originalText: string;
  translatedText: string;
  audioUrl?: string;
  sourceLang: string;
  targetLang: string;
}

export default function VideoTranslator() {
  const { toast } = useToast();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("fr");
  const [generateVoiceover, setGenerateVoiceover] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<any>(null);

  const handleUrlValidation = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const handleTranslate = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL manquante",
        description: "Veuillez entrer une URL YouTube valide",
        variant: "destructive"
      });
      return;
    }

    if (!handleUrlValidation(youtubeUrl)) {
      toast({
        title: "URL invalide", 
        description: "Format d'URL YouTube non reconnu",
        variant: "destructive"
      });
      return;
    }

    if (!targetLang) {
      toast({
        title: "Langue manquante",
        description: "Veuillez sélectionner une langue cible",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    
    try {
      const translationResult = await VideoTranslationService.translateVideo({
        youtubeUrl,
        sourceLang,
        targetLang,
        generateVoiceover,
        onProgress: (step, percentage) => {
          setCurrentStep(step);
          setProgress(percentage);
        }
      });

      setResult(translationResult);
      setVideoMetadata(translationResult.metadata);
      
      toast({
        title: "Traduction terminée!",
        description: generateVoiceover 
          ? "Texte traduit et voix off générée avec succès"
          : "Texte traduit avec succès"
      });

    } catch (error: any) {
      console.error('Translation error:', error);
      toast({
        title: "Erreur de traduction",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep("");
      setProgress(0);
    }
  };

  const downloadText = () => {
    if (!result) return;
    
    const content = `Vidéo YouTube: ${youtubeUrl}\n\nTexte original (${result.sourceLang}):\n${result.originalText}\n\nTraduction (${result.targetLang}):\n${result.translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `traduction-youtube-${result.targetLang}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageByCode = (code: string) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Youtube className="w-8 h-8 text-destructive" />
            <Languages className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Traducteur Vidéo YouTube</h1>
          <p className="text-muted-foreground">
            Extrayez l'audio, transcrivez et traduisez vos vidéos YouTube en plusieurs langues
          </p>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Youtube className="w-5 h-5" />
              <span>Configuration</span>
            </CardTitle>
            <CardDescription>
              Entrez l'URL YouTube et sélectionnez vos préférences de traduction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* YouTube URL */}
            <div className="space-y-2">
              <Label htmlFor="youtube-url">URL YouTube</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
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
                <span>Générer la voix off</span>
              </Label>
              <Badge variant="secondary">Premium</Badge>
            </div>

            {/* Action Button */}
            <Button 
              onClick={handleTranslate}
              disabled={isProcessing || !youtubeUrl || !handleUrlValidation(youtubeUrl)}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4 mr-2" />
                  Traduire la vidéo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{currentStep}</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Résultats</span>
              </CardTitle>
              <CardDescription>
                Traduction de {getLanguageByCode(result.sourceLang)?.name || result.sourceLang} vers {getLanguageByCode(result.targetLang)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Original Text */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <span>Texte original</span>
                  <Badge variant="outline">{result.sourceLang}</Badge>
                </Label>
                <Textarea
                  value={result.originalText}
                  readOnly
                  className="min-h-[100px] bg-secondary/30"
                />
              </div>

              <Separator />

              {/* Translated Text */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <span>Texte traduit</span>
                  <Badge variant="default">{result.targetLang}</Badge>
                </Label>
                <Textarea
                  value={result.translatedText}
                  readOnly
                  className="min-h-[100px] bg-primary/5 border-primary/20"
                />
              </div>

              {/* Audio Player */}
              {result.audioUrl && (
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <span>Voix off générée</span>
                  </Label>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <audio controls className="w-full">
                      <source src={result.audioUrl} type="audio/mpeg" />
                      Votre navigateur ne support pas l'élément audio.
                    </audio>
                  </div>
                </div>
              )}

              {/* Download Actions */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button variant="outline" onClick={downloadText}>
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger le texte
                </Button>
                {result.audioUrl && (
                  <Button variant="outline" asChild>
                    <a href={result.audioUrl} download>
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger l'audio
                    </a>
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