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
import { AudioRecordingControls } from "@/components/AudioRecordingControls";
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
              <div className="mt-4 space-y-4">
                <Label className="text-sm font-medium">Aperçu vidéo</Label>
                <div className="aspect-video max-w-md">
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
                
                {/* Ajout des contrôles d'enregistrement sous la vidéo */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Enregistrer un commentaire audio</h3>
                  <AudioRecordingControls
                    recordingState={recorderState}
                    onStartRecording={startRecording}
                    onPauseRecording={pauseRecording}
                    onResumeRecording={resumeRecording}
                    onStopRecording={stopRecording}
                    onTranscribe={lastRecording ? transcribeRecording : undefined}
                    onDownload={lastRecording ? () => downloadRecording(lastRecording, `recording-${Date.now()}.webm`) : undefined}
                    isTranscribing={isTranscribing}
                    compact={true}
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
            <div className="space-y-6">
              <AudioRecordingControls
                recordingState={recorderState}
                onStartRecording={startRecording}
                onPauseRecording={pauseRecording}
                onResumeRecording={resumeRecording}
                onStopRecording={stopRecording}
                onTranscribe={lastRecording ? transcribeRecording : undefined}
                onDownload={lastRecording ? () => downloadRecording(lastRecording, `recording-${Date.now()}.webm`) : undefined}
                isTranscribing={isTranscribing}
              />

              {/* Post-recording Actions */}
              {lastRecording && !recorderState.isRecording && !recorderState.isPaused && (
                <Card className="bg-white/70 backdrop-blur-sm border-border/20">
                  <CardContent className="pt-6">
                    <Button 
                      onClick={() => {
                        const url = URL.createObjectURL(lastRecording.blob);
                        const audio = new Audio(url);
                        audio.play();
                      }}
                      variant="outline"
                      className="w-full mb-2"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Écouter l'enregistrement
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Recording History */}
              {recordingStorage.recordings.length > 0 && (
                <Card className="bg-white/70 backdrop-blur-sm border-border/20">
                  <CardHeader>
                    <CardTitle className="text-sm">Historique des enregistrements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {recordingStorage.recordings.slice(0, 5).map((recording) => (
                        <div key={recording.id} className="flex items-center justify-between bg-white/50 rounded p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recording.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {AudioRecorderService.formatDuration(recording.duration * 1000)} • {AudioRecorderService.formatSize(recording.file_size)}
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
                  </CardContent>
                </Card>
              )}
            </div>
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