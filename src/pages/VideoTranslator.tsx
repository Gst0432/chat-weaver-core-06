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
  MicOff,
  Square,
  Clock,
  HardDrive,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { RealTimeTranscriptionService } from "@/services/realTimeTranscriptionService";
import { AudioRecorderService, AudioRecording, RecordingState } from "@/services/audioRecorderService";
import YouTube from 'react-youtube';

const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  translatedText?: string;
  audioUrl?: string;
  language?: string;
}

type WorkflowPhase = 'setup' | 'transcribing' | 'ready-to-translate' | 'translating' | 'completed';

export default function VideoTranslator() {
  const { toast } = useToast();
  const playerRef = useRef<any>(null);
  const transcriptionServiceRef = useRef<RealTimeTranscriptionService | null>(null);
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);
  
  const { videoId, extractVideoId, setVideoId } = useYouTubePlayer();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("fr");
  const [generateVoiceover, setGenerateVoiceover] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // Audio recording states
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
    currentRecording: null
  });
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const [originalSegments, setOriginalSegments] = useState<TranscriptionSegment[]>([]);
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptionSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<TranscriptionSegment | null>(null);
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>('setup');
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 });
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    try {
      setIsListening(true);
      setWorkflowPhase('transcribing');
      setOriginalSegments([]);
      setTranslatedSegments([]);
      setFullAudioUrl(null);
      setTranscriptionStatus('Initialisation...');
      setIsProcessing(true);
      
      transcriptionServiceRef.current = new RealTimeTranscriptionService();
      
      // Try system audio capture first, fallback to microphone
      try {
        await transcriptionServiceRef.current.startTranscriptionOnly(sourceLang);
        setTranscriptionStatus('Écoute audio système en cours...');
        toast({
          title: "Transcription activée",
          description: "Capture audio système en cours. Lancez la vidéo pour commencer.",
        });
      } catch (systemError) {
        console.warn('System audio not available, falling back to microphone:', systemError);
        await transcriptionServiceRef.current.startMicrophoneTranscriptionOnly(sourceLang);
        setTranscriptionStatus('Écoute microphone en cours...');
        toast({
          title: "Microphone activé", 
          description: "Utilisez votre microphone près des haut-parleurs pour capturer l'audio.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error starting transcription:', error);
      setIsListening(false);
      setWorkflowPhase('setup');
      setIsProcessing(false);
      setTranscriptionStatus('Erreur');
      toast({
        title: "Erreur",
        description: "Impossible d'accéder à l'audio. Vérifiez les permissions.",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stop();
      transcriptionServiceRef.current = null;
    }
    setIsListening(false);
    setIsProcessing(false);
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
    
    setWorkflowPhase(originalSegments.length > 0 ? 'ready-to-translate' : 'setup');
    setTranscriptionStatus(originalSegments.length > 0 ? `Terminé - ${originalSegments.length} segments transcrits` : 'Aucun segment transcrit');
    
    toast({
      title: "Transcription terminée",
      description: originalSegments.length > 0 ? "Vous pouvez maintenant traduire le texte." : "Aucun texte transcrit."
    });
  };

  // Listen for transcription-only segments
  useEffect(() => {
    const handleTranscriptionOnly = (event: CustomEvent) => {
      const { segment, isProcessing, totalSegments } = event.detail;
      setOriginalSegments(prev => [...prev, segment]);
      setCurrentSegment(segment);
      setIsProcessing(isProcessing || false);
      setTranscriptionStatus(totalSegments ? `${totalSegments} segments transcrits` : 'Transcription en cours...');
    };

    const handleTranscriptionError = (event: CustomEvent) => {
      const { error } = event.detail;
      toast({
        title: "Erreur de transcription",
        description: error,
        variant: "destructive",
      });
      setTranscriptionStatus('Erreur de transcription');
    };

    const handleTranslationProgress = (event: CustomEvent) => {
      const { current, total, segment } = event.detail;
      setTranslationProgress({ current, total });
      setTranslatedSegments(prev => [...prev, segment]);
    };

    window.addEventListener('transcription-only', handleTranscriptionOnly as EventListener);
    window.addEventListener('transcription-error', handleTranscriptionError as EventListener);
    window.addEventListener('translation-progress', handleTranslationProgress as EventListener);
    
    return () => {
      window.removeEventListener('transcription-only', handleTranscriptionOnly as EventListener);
      window.removeEventListener('transcription-error', handleTranscriptionError as EventListener);
      window.removeEventListener('translation-progress', handleTranslationProgress as EventListener);
    };
  }, []);

  const startTranslation = async () => {
    if (!transcriptionServiceRef.current || originalSegments.length === 0) return;
    
    try {
      setWorkflowPhase('translating');
      setTranslatedSegments([]);
      setTranslationProgress({ current: 0, total: originalSegments.length });
      
      const translatedSegments = await transcriptionServiceRef.current.translateAllSegments(targetLang);
      
      setWorkflowPhase('completed');
      
      if (generateVoiceover) {
        const audioUrl = await transcriptionServiceRef.current.generateFullVoiceover(translatedSegments, targetLang);
        setFullAudioUrl(audioUrl);
      }
      
      toast({
        title: "Traduction terminée",
        description: `${translatedSegments.length} segments traduits avec succès.`
      });
    } catch (error) {
      console.error('Translation error:', error);
      setWorkflowPhase('ready-to-translate');
      toast({
        title: "Erreur de traduction",
        description: "Impossible de traduire le texte. Réessayez.",
        variant: "destructive"
      });
    }
  };

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

  const downloadFullAudio = () => {
    if (!fullAudioUrl) return;
    
    const a = document.createElement('a');
    a.href = fullAudioUrl;
    a.download = `voiceover-${targetLang}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      audioRecorderRef.current = new AudioRecorderService(setRecordingState);
      await audioRecorderRef.current.startRecording();
      
      toast({
        title: "Enregistrement démarré",
        description: "Parlez dans votre microphone pour enregistrer",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erreur d'enregistrement",
        description: error instanceof Error ? error.message : "Impossible de démarrer l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    audioRecorderRef.current?.pauseRecording();
  };

  const resumeRecording = () => {
    audioRecorderRef.current?.resumeRecording();
  };

  const stopRecording = async () => {
    if (!audioRecorderRef.current) return;
    
    try {
      const recording = await audioRecorderRef.current.stopRecording();
      setCurrentRecording(recording);
      setRecordingState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        size: 0,
        currentRecording: null
      });
      
      toast({
        title: "Enregistrement terminé",
        description: `Audio enregistré (${AudioRecorderService.formatDuration(recording.duration)})`,
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'arrêter l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const transcribeRecording = async () => {
    if (!currentRecording) return;
    
    setIsTranscribing(true);
    try {
      const text = await AudioRecorderService.transcribeRecording(currentRecording);
      setTranscribedText(text);
      
      toast({
        title: "Transcription réussie",
        description: "Le texte a été transcrit avec succès",
      });
    } catch (error) {
      console.error('Error transcribing:', error);
      toast({
        title: "Erreur de transcription",
        description: error instanceof Error ? error.message : "Impossible de transcrire l'audio",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startTranslationFromText = async (text: string) => {
    try {
      // Create a mock segment from the transcribed text
      const segment: TranscriptionSegment = {
        id: Date.now().toString(),
        text: text,
        startTime: 0,
        endTime: 0
      };
      
      setOriginalSegments([segment]);
      setWorkflowPhase('ready-to-translate');
      
      // Automatically start translation
      setWorkflowPhase('translating');
      setTranslatedSegments([]);
      setTranslationProgress({ current: 0, total: 1 });
      
      // Use the translation service
      const translatedText = await RealTimeTranscriptionService.translateText(text, sourceLang === 'auto' ? 'fr' : sourceLang, targetLang);
      
      const translatedSegment: TranscriptionSegment = {
        ...segment,
        translatedText: translatedText
      };
      
      setTranslatedSegments([translatedSegment]);
      setWorkflowPhase('completed');
      
      if (generateVoiceover) {
        const audioUrl = await RealTimeTranscriptionService.generateVoiceSegment(translatedText, targetLang);
        if (audioUrl) {
          setFullAudioUrl(audioUrl);
        }
      }
      
      toast({
        title: "Traduction terminée",
        description: "Le texte a été traduit avec succès",
      });
    } catch (error) {
      console.error('Translation error:', error);
      setWorkflowPhase('ready-to-translate');
      toast({
        title: "Erreur de traduction",
        description: "Impossible de traduire le texte. Réessayez.",
        variant: "destructive"
      });
    }
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
                <Select 
                  value={sourceLang} 
                  onValueChange={setSourceLang}
                  disabled={workflowPhase === 'transcribing'}
                >
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
                <Select 
                  value={targetLang} 
                  onValueChange={setTargetLang}
                  disabled={workflowPhase === 'transcribing'}
                >
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
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  id="voiceover"
                  checked={generateVoiceover}
                  onCheckedChange={setGenerateVoiceover}
                  disabled={workflowPhase === 'transcribing'}
                />
                <Label htmlFor="voiceover" className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Générer la voix off complète</span>
                </Label>
                <Badge variant="secondary">Premium</Badge>
              </div>
              
              {workflowPhase === 'ready-to-translate' && (
                <Button onClick={startTranslation} variant="default">
                  <Languages className="w-4 h-4 mr-2" />
                  Traduire maintenant
                </Button>
              )}
              
              {workflowPhase === 'translating' && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Traduction en cours... {translationProgress.current}/{translationProgress.total}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Interface - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audio Recording Column */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Mic className="w-5 h-5" />
                  <span>Enregistrement Audio</span>
                </span>
              </CardTitle>
              <CardDescription>
                Enregistrez votre voix ou toute source audio pour la transcrire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recording Controls */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={startRecording}
                  disabled={recordingState.isRecording || recordingState.isPaused}
                  variant={recordingState.isRecording ? "secondary" : "default"}
                  className="w-full"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  <span>Enregistrer</span>
                </Button>
                
                <Button
                  onClick={recordingState.isPaused ? resumeRecording : pauseRecording}
                  disabled={!recordingState.isRecording && !recordingState.isPaused}
                  variant="outline"
                  className="w-full"
                >
                  {recordingState.isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      <span>Continuer</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      <span>Pause</span>
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={stopRecording}
                  disabled={!recordingState.isRecording && !recordingState.isPaused}
                  variant="destructive"
                  className="w-full col-span-2"
                >
                  <Square className="w-4 h-4 mr-2" />
                  <span>Arrêter</span>
                </Button>
              </div>

              {/* Recording Status */}
              {(recordingState.isRecording || recordingState.isPaused) && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {recordingState.isRecording && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                      <span className="text-sm font-medium">
                        {recordingState.isPaused ? 'Enregistrement en pause' : 'Enregistrement en cours...'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{AudioRecorderService.formatDuration(recordingState.duration)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <HardDrive className="w-3 h-3" />
                    <span>Taille: {AudioRecorderService.formatSize(recordingState.size)}</span>
                  </div>
                </div>
              )}

              {/* Current Recording Actions */}
              {currentRecording && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Enregistrement terminé</h4>
                    <Badge variant="secondary">
                      {AudioRecorderService.formatDuration(currentRecording.duration)}
                    </Badge>
                  </div>
                  
                  {/* Audio Player */}
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <audio 
                      controls 
                      className="w-full"
                      src={URL.createObjectURL(currentRecording.blob)}
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      onClick={() => AudioRecorderService.downloadRecording(currentRecording)}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger Audio
                    </Button>
                    
                    <Button
                      onClick={transcribeRecording}
                      disabled={isTranscribing}
                      variant="default"
                      className="w-full"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Transcription...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          <span>Transcrire avec IA</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Transcribed Text */}
              {transcribedText && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Texte transcrit</span>
                  </h4>
                  
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-sm">{transcribedText}</p>
                  </div>
                  
                  <Button
                    onClick={() => startTranslationFromText(transcribedText)}
                    variant="default"
                    className="w-full"
                  >
                    <Languages className="w-4 h-4 mr-2" />
                    Traduire ce texte
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original Text Column */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Texte Original</span>
                  <Badge variant="outline">
                    {getLanguageByCode(sourceLang === 'auto' ? 'fr' : sourceLang)?.flag} 
                    {getLanguageByCode(sourceLang === 'auto' ? 'fr' : sourceLang)?.name}
                  </Badge>
                </div>
                {isListening && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">{transcriptionStatus}</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {originalSegments.length === 0 ? (
                  <div className="text-center py-8">
                    {isListening ? (
                      <div className="space-y-2">
                        <div className="animate-pulse flex justify-center">
                          <div className="w-8 h-8 bg-primary/30 rounded-full"></div>
                        </div>
                        <p className="text-muted-foreground">{transcriptionStatus}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Démarrez l'écoute pour voir la transcription en temps réel</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {originalSegments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className={`p-2 rounded-lg text-sm animate-fade-in ${
                          currentSegment === segment 
                            ? 'bg-primary/20 border border-primary/30' 
                            : 'bg-secondary/30'
                        }`}
                      >
                        <span className="text-primary/70 text-xs mr-2">#{index + 1}</span>
                        {segment.text}
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="text-muted-foreground text-sm italic animate-pulse p-2">
                        Traitement en cours...
                      </div>
                    )}
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
                {workflowPhase === 'setup' || workflowPhase === 'transcribing' ? (
                  <p className="text-muted-foreground text-center py-8">
                    {workflowPhase === 'transcribing' 
                      ? "Transcription en cours. La traduction sera disponible après l'arrêt."
                      : "La traduction apparaîtra après la transcription"
                    }
                  </p>
                ) : workflowPhase === 'ready-to-translate' ? (
                  <div className="text-center py-8 space-y-4">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                    <p className="text-muted-foreground">
                      Transcription terminée ! Cliquez sur "Traduire maintenant" pour commencer la traduction.
                    </p>
                  </div>
                ) : workflowPhase === 'translating' ? (
                  <div className="text-center py-8 space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                    <p className="text-muted-foreground">
                      Traduction en cours... {translationProgress.current}/{translationProgress.total}
                    </p>
                  </div>
                ) : translatedSegments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune traduction disponible
                  </p>
                ) : (
                  <>
                    {translatedSegments.map((segment, index) => (
                      <div key={segment.id || index} className="p-2 rounded-lg text-sm bg-primary/10 border border-primary/20">
                        {segment.translatedText || segment.text}
                      </div>
                    ))}
                    {fullAudioUrl && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            Voix off complète générée
                          </span>
                          <Button size="sm" variant="outline" onClick={downloadFullAudio}>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                        <audio controls className="w-full">
                          <source src={fullAudioUrl} type="audio/mpeg" />
                        </audio>
                      </div>
                    )}
                  </>
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