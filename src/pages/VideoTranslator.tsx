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
import { Checkbox } from "@/components/ui/checkbox";
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
  Bot,
  Trash2,
  Circle,
  Globe,
  Settings,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { RealTimeTranscriptionService } from "@/services/realTimeTranscriptionService";
import { AudioRecorderService, AudioRecording, RecordingState } from "@/services/audioRecorderService";
import { useRecordingStorage } from "@/hooks/useRecordingStorage";
import YouTube from 'react-youtube';
import { supabase } from '@/integrations/supabase/client';

const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

interface TranscriptionSegment {
  id: string;
  originalText: string;
  translatedText?: string;
  timestamp?: string;
  audioUrl?: string;
  language?: string;
}

type WorkflowPhase = 'configuration' | 'listening' | 'transcribing' | 'translating' | 'completed';
type AppMode = 'youtube' | 'recording';

export default function VideoTranslator() {
  const { toast } = useToast();
  const recordingStorage = useRecordingStorage();
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);
  
  const { videoId, extractVideoId, setVideoId } = useYouTubePlayer();
  const [appMode, setAppMode] = useState<AppMode>('recording');
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sourceLang, setSourceLang] = useState("fr");
  const [targetLang, setTargetLang] = useState("en");
  const [generateVoiceover, setGenerateVoiceover] = useState(false);
  
  // Audio recording states
  const [recorderState, setRecorderState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
    currentRecording: null
  });
  const [lastRecording, setLastRecording] = useState<AudioRecording | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptionSegment[]>([]);
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>('configuration');
  const [isListening, setIsListening] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [downloadableFiles, setDownloadableFiles] = useState({
    transcription: null as Blob | null,
    translation: null as Blob | null,
    voiceover: null as Blob | null,
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    const extractedVideoId = extractVideoId(url);
    setVideoId(extractedVideoId);
  };

  const onPlayerReady = (event: any) => {
    console.log('YouTube player ready');
  };

  const startListening = async () => {
    // This would be for YouTube mode transcription
    setIsListening(true);
    setWorkflowPhase('listening');
  };

  const stopListening = () => {
    setIsListening(false);
    setWorkflowPhase('configuration');
  };

  // Audio recording functions
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const startRecording = async () => {
    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorderService();
      }
      
      audioRecorderRef.current.setStateChangeCallback(setRecorderState);
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
      setLastRecording(recording);
      setRecordingBlob(recording.blob);
      
      // Optionally save to database
      if (recording) {
        await recordingStorage.saveRecording(recording, `Enregistrement ${new Date().toLocaleString()}`);
      }
      
      toast({
        title: "Enregistrement terminé",
        description: `Audio enregistré (${formatDuration(recording.duration)})`,
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

  const downloadRecording = (recording: AudioRecording, filename: string) => {
    AudioRecorderService.downloadRecording(recording, filename);
  };

  const transcribeRecording = async () => {
    if (!lastRecording) return;
    
    setIsTranscribing(true);
    try {
      const text = await AudioRecorderService.transcribeRecording(lastRecording);
      
      // Create transcription segment
      const segment: TranscriptionSegment = {
        id: Date.now().toString(),
        originalText: text,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setTranscriptionSegments([segment]);
      
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

  const startTranslationFromText = async () => {
    if (transcriptionSegments.length === 0) return;
    
    setWorkflowPhase('translating');
    try {
      const translatedSegments: TranscriptionSegment[] = [];
      
      for (const segment of transcriptionSegments) {
        const response = await supabase.functions.invoke('translate-text', {
          body: {
            text: segment.originalText,
            sourceLang,
            targetLang
          }
        });
        
        if (response.error) throw response.error;
        
        translatedSegments.push({
          ...segment,
          translatedText: response.data.translatedText
        });
      }
      
      setTranslatedSegments(translatedSegments);
      setWorkflowPhase('completed');
      
      toast({
        title: "Traduction terminée",
        description: "Le texte a été traduit avec succès",
      });
    } catch (error) {
      console.error('Translation error:', error);
      setWorkflowPhase('configuration');
      toast({
        title: "Erreur de traduction",
        description: "Impossible de traduire le texte. Réessayez.",
        variant: "destructive"
      });
    }
  };

  const downloadTranscription = () => {
    const originalText = transcriptionSegments.map(s => s.originalText).join('\n');
    const translatedText = translatedSegments.map(s => s.translatedText || s.originalText).join('\n');
    
    const content = `Transcription:\n${originalText}\n\nTraduction (${targetLang}):\n${translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    setDownloadableFiles(prev => ({ ...prev, transcription: blob }));
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${targetLang}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFullAudio = () => {
    if (!downloadableFiles.voiceover) return;
    
    const url = URL.createObjectURL(downloadableFiles.voiceover);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceover-${targetLang}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img 
                  src="/lovable-uploads/4d23475f-fa47-4f1b-bba0-5b597d4be24b.png" 
                  alt="Chatelix" 
                  className="w-8 h-8 rounded-lg"
                />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Traducteur Vidéo Avancé
                </h1>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                IA
              </Badge>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-2 bg-white/60 rounded-lg p-1">
              <Button
                variant={appMode === 'youtube' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAppMode('youtube')}
                className="text-xs"
              >
                <Youtube className="w-4 h-4 mr-1" />
                YouTube
              </Button>
              <Button
                variant={appMode === 'recording' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAppMode('recording')}
                className="text-xs"
              >
                <Mic className="w-4 h-4 mr-1" />
                Enregistrement
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6 bg-white/70 backdrop-blur-sm border-border/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appMode === 'youtube' && (
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">URL YouTube</Label>
                  <Input
                    id="youtube-url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={handleUrlChange}
                    className="bg-white/80"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="source-lang">Langue source</Label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger className="bg-white/80">
                    <SelectValue placeholder="Sélectionner..." />
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

              <div className="space-y-2">
                <Label htmlFor="target-lang">Langue cible</Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger className="bg-white/80">
                    <SelectValue placeholder="Sélectionner..." />
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="generate-voiceover" className="text-sm">Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generate-voiceover"
                    checked={generateVoiceover}
                    onCheckedChange={(checked) => setGenerateVoiceover(checked === true)}
                  />
                  <Label htmlFor="generate-voiceover" className="text-sm">
                    Générer voix off
                  </Label>
                </div>
              </div>
            </div>

            {appMode === 'youtube' && videoId && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Aperçu vidéo</Label>
                <div className="mt-2 aspect-video max-w-md">
                  <YouTube
                    videoId={videoId}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: {
                        autoplay: 0,
                        controls: 1,
                        rel: 0,
                        showinfo: 0,
                      },
                    }}
                    onReady={onPlayerReady}
                    className="rounded-lg overflow-hidden"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Interface */}
        <div className={`grid gap-6 ${
          appMode === 'youtube' 
            ? 'grid-cols-1 lg:grid-cols-3' 
            : 'grid-cols-1 lg:grid-cols-2'
        }`}>
          
          {/* Audio Recording Column - Only show in recording mode */}
          {appMode === 'recording' && (
            <Card className="bg-white/70 backdrop-blur-sm border-border/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Enregistrement Audio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recording Controls */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={startRecording}
                    disabled={recorderState.isRecording || recorderState.isPaused}
                    variant="default"
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Circle className="w-4 h-4 mr-2 fill-current" />
                    Enregistrer
                  </Button>
                  
                  <Button
                    onClick={pauseRecording}
                    disabled={!recorderState.isRecording || recorderState.isPaused}
                    variant="outline"
                    size="sm"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  
                  <Button
                    onClick={resumeRecording}
                    disabled={!recorderState.isPaused}
                    variant="outline"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Continuer
                  </Button>
                  
                  <Button
                    onClick={stopRecording}
                    disabled={!recorderState.isRecording && !recorderState.isPaused}
                    variant="outline"
                    size="sm"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Arrêter
                  </Button>
                </div>

                {/* Recording Status */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      recorderState.isRecording && !recorderState.isPaused 
                        ? 'bg-red-100 text-red-800' 
                        : recorderState.isPaused
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {recorderState.isRecording && !recorderState.isPaused 
                        ? '🔴 Enregistrement en cours...' 
                        : recorderState.isPaused
                        ? '⏸️ En pause'
                        : '⏹️ Arrêté'
                      }
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Durée: {formatDuration(recorderState.duration)}</div>
                    <div>Taille: {formatSize(recorderState.size)}</div>
                  </div>

                  {(recorderState.isRecording || recorderState.isPaused) && (
                    <div className="mt-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((recorderState.duration / 600000) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Max: 10 minutes
                      </div>
                    </div>
                  )}
                </div>

                {/* Post-Recording Actions */}
                {lastRecording && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">Dernier enregistrement</h4>
                    <div className="text-sm text-muted-foreground">
                      Durée: {formatDuration(lastRecording.duration)} | 
                      Taille: {formatSize(lastRecording.size)}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {recordingBlob && (
                        <Button
                          onClick={() => {
                            const audio = new Audio(URL.createObjectURL(recordingBlob));
                            audio.play();
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Volume2 className="w-4 h-4 mr-2" />
                          Écouter
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => downloadRecording(lastRecording, 'enregistrement-audio')}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                      
                      <Button
                        onClick={transcribeRecording}
                        disabled={!lastRecording || isTranscribing}
                        variant="default"
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Transcription...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Transcrire avec IA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Recordings History */}
                {recordingStorage.recordings.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">Historique des enregistrements</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {recordingStorage.recordings.slice(0, 5).map((recording) => (
                        <div key={recording.id} className="flex items-center justify-between bg-white/50 rounded p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recording.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(recording.duration * 1000)} • {formatSize(recording.file_size)}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              onClick={async () => {
                                const blob = await recordingStorage.getRecordingBlob(recording.file_path);
                                if (blob) {
                                  const audio = new Audio(URL.createObjectURL(blob));
                                  audio.play();
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Volume2 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => recordingStorage.deleteRecording(recording.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Original Text Column - Only show in YouTube mode */}
          {appMode === 'youtube' && (
            <Card className="bg-white/70 backdrop-blur-sm border-border/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Texte Original
                  <span className="text-sm font-normal text-muted-foreground">
                    {SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.flag} 
                    {SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto bg-muted/30 rounded-lg p-4">
                  {transcriptionSegments.length > 0 ? (
                    <div className="space-y-3">
                      {transcriptionSegments.map((segment, index) => (
                        <div key={index} className="bg-white/80 rounded-lg p-3 border border-border/20">
                          <p className="text-sm">{segment.originalText}</p>
                          {segment.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {segment.timestamp}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <FileText className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-center">
                        Démarrez l'écoute pour voir la transcription en temps réel
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Translated Text Column */}
          <Card className="bg-white/70 backdrop-blur-sm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Traduction
                <span className="text-sm font-normal text-muted-foreground">
                  {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.flag}
                  {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-96 overflow-y-auto bg-muted/30 rounded-lg p-4">
                {translatedSegments.length > 0 ? (
                  <div className="space-y-3">
                    {translatedSegments.map((segment, index) => (
                      <div key={index} className="bg-white/80 rounded-lg p-3 border border-border/20">
                        <p className="text-sm">{segment.translatedText}</p>
                        {segment.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {segment.timestamp}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Globe className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-center">
                      La traduction apparaîtra ici après la transcription
                    </p>
                  </div>
                )}
              </div>

              {transcriptionSegments.length > 0 && (
                <Button
                  onClick={startTranslationFromText}
                  disabled={workflowPhase === 'translating'}
                  className="w-full"
                >
                  {workflowPhase === 'translating' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traduction en cours...
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4 mr-2" />
                      Traduire le texte
                    </>
                  )}
                </Button>
              )}

              {generateVoiceover && translatedSegments.length > 0 && (
                <div className="space-y-2">
                  <Button
                    onClick={downloadFullAudio}
                    disabled={!downloadableFiles.voiceover}
                    variant="outline"
                    className="w-full"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Télécharger la voix off complète
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Download Section */}
        {(transcriptionSegments.length > 0 || translatedSegments.length > 0) && (
          <Card className="mt-6 bg-white/70 backdrop-blur-sm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Téléchargements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {transcriptionSegments.length > 0 && (
                  <Button
                    onClick={downloadTranscription}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Télécharger la transcription
                  </Button>
                )}
                {translatedSegments.length > 0 && generateVoiceover && (
                  <Button
                    onClick={downloadFullAudio}
                    disabled={!downloadableFiles.voiceover}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    Télécharger la voix off
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