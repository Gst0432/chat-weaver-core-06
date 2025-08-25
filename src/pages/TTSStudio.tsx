import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, Play, Download, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { TextToSpeechService, TTSSettings } from "@/services/textToSpeechService";

const TTSStudio = () => {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState<'openai' | 'google' | 'openrouter'>('openai');
  const [voice, setVoice] = useState("alloy");
  const [language, setLanguage] = useState("fr-FR");
  const [speed, setSpeed] = useState([1.0]);
  const [format, setFormat] = useState<'mp3' | 'wav' | 'opus'>('mp3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const availableVoices = TextToSpeechService.getAvailableVoices();

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Veuillez entrer du texte");
      return;
    }

    setIsGenerating(true);
    try {
      const settings: TTSSettings = {
        provider,
        voice,
        language,
        speed: speed[0],
        format
      };

      const result = await TextToSpeechService.generateSpeech(text, settings);
      const audioBlob = TextToSpeechService.base64ToBlob(result.audioContent, result.mime);
      const url = URL.createObjectURL(audioBlob);
      
      setAudioUrl(url);
      toast.success("Audio généré avec succès!");
    } catch (error) {
      console.error('Erreur génération TTS:', error);
      toast.error("Erreur lors de la génération audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!audioUrl) return;
    
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(audioUrl);
    audio.play();
    setAudioElement(audio);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `tts-audio-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCurrentVoices = () => {
    const lang = language.startsWith('fr') ? 'fr' : 
                  language.startsWith('en') ? 'en' : 
                  language.startsWith('es') ? 'es' : 'ar';
    return availableVoices[lang]?.[provider] || availableVoices['fr'][provider];
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Studio Text-to-Speech</h1>
        <p className="text-muted-foreground">Convertissez votre texte en audio avec différentes voix et langues</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Configurez les paramètres de synthèse vocale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="text">Texte à convertir</Label>
              <Textarea
                id="text"
                placeholder="Entrez le texte que vous souhaitez convertir en audio..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur</Label>
                <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Langue</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr-FR">Français</SelectItem>
                    <SelectItem value="en-US">Anglais</SelectItem>
                    <SelectItem value="es-ES">Espagnol</SelectItem>
                    <SelectItem value="ar-XA">Arabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Voix</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentVoices().map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Format</Label>
                <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp3">MP3</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="opus">OPUS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Vitesse: {speed[0]}</Label>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                min={0.25}
                max={4.0}
                step={0.25}
                className="mt-2"
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !text.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Générer l'audio
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Résultat</CardTitle>
            <CardDescription>
              Votre fichier audio apparaîtra ici
            </CardDescription>
          </CardHeader>
          <CardContent>
            {audioUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-center mb-4">
                    <Volume2 className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground mb-4">
                    Audio généré avec {provider} - {voice}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handlePlay} className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      Écouter
                    </Button>
                    <Button onClick={handleDownload} variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground">Aucun audio généré</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TTSStudio;