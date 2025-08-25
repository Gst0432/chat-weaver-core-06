import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Download, FileText, History, Volume2, Trash2, Loader, Languages, AudioLines, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AudioRecordingControls } from '@/components/AudioRecordingControls';
import { AudioRecorderService, RecordingState } from '@/services/audioRecorderService';
import { useRecordingStorage } from '@/hooks/useRecordingStorage';
import { useToast } from '@/hooks/use-toast';

const SUPPORTED_LANGUAGES = {
  'auto': 'Détection automatique',
  'fr': 'Français',
  'en': 'Anglais',
  'es': 'Espagnol',
  'de': 'Allemand',
  'it': 'Italien',
  'pt': 'Portugais',
  'ru': 'Russe',
  'ja': 'Japonais',
  'ko': 'Coréen',
  'zh': 'Chinois',
  'ar': 'Arabe'
};

const TARGET_LANGUAGES = {
  'fr': 'Français',
  'en': 'Anglais',
  'es': 'Espagnol',
  'de': 'Allemand',
  'it': 'Italien',
  'pt': 'Portugais',
  'ru': 'Russe',
  'ja': 'Japonais',
  'ko': 'Coréen',
  'zh': 'Chinois',
  'ar': 'Arabe'
};

const TTS_VOICES = {
  'alloy': 'Alloy (Neutre)',
  'echo': 'Echo (Masculin)',
  'fable': 'Fable (Britannique)',
  'onyx': 'Onyx (Masculin profond)',
  'nova': 'Nova (Féminin)',
  'shimmer': 'Shimmer (Féminin doux)'
};

interface AudioRecording {
  id: string;
  title: string;
  file_path: string;
  duration: number;
  created_at: string;
}

interface Transcription {
  id: string;
  original_text: string;
  language: string;
  confidence: number;
  created_at: string;
  recording_id: string;
}

interface Translation {
  id: string;
  transcription_id: string;
  source_language: string;
  target_language: string;
  translated_text: string;
  voiceover_url?: string;
  created_at: string;
}

export default function SpeechToText() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { recordings, saveRecording, deleteRecording, saveTranscription } = useRecordingStorage();
  
  // Audio recording
  const [audioRecorder] = useState(() => new AudioRecorderService());
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
    currentRecording: null
  });
  
  // State management
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);

  // Load history on component mount
  useEffect(() => {
    loadTranscriptions();
    loadTranslations();
    
    // Setup audio recorder callback
    audioRecorder.setStateChangeCallback(setRecordingState);
    
    return () => {
      audioRecorder.setStateChangeCallback(() => {});
    };
  }, [audioRecorder]);

  const loadTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from('translation_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTranslations(data || []);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  const loadTranscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTranscriptions(data || []);
    } catch (error) {
      console.error('Failed to load transcriptions:', error);
    }
  };

  // Audio file upload handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner un fichier audio ou vidéo.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 1GB)
    if (file.size > 1024 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille du fichier ne doit pas dépasser 1GB.",
        variant: "destructive",
      });
      return;
    }

    await processAudioFile(file);
  };

  // Process audio file for transcription
  const processAudioFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStep('Traitement du fichier audio...');
    setProgress(25);

    try {
      // Convert file to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProcessingStep('Transcription en cours...');
      setProgress(50);

      // Call voice-to-text function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio,
          language: sourceLanguage === 'auto' ? undefined : sourceLanguage
        }
      });

      if (error) throw error;

      setProgress(75);
      setProcessingStep('Finalisation...');

      // Set transcription result
      setTranscription(data.text);

      // Save transcription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const recordingId = crypto.randomUUID();
        setCurrentRecordingId(recordingId);
        
        const { error: saveError } = await supabase
          .from('transcriptions')
          .insert({
            user_id: user.id,
            original_text: data.text,
            language: sourceLanguage,
            confidence: 0.9,
            recording_id: recordingId
          });

        if (saveError) {
          console.error('Failed to save transcription:', saveError);
        }
      }

      setProgress(100);
      loadTranscriptions(); // Refresh history

      toast({
        title: "Transcription réussie",
        description: "Le fichier audio a été transcrit avec succès.",
      });

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Erreur de transcription",
        description: "Impossible de transcrire le fichier audio.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      setProgress(0);
    }
  };

  // Recording controls
  const handleStartRecording = async () => {
    try {
      await audioRecorder.startRecording();
    } catch (error) {
      toast({
        title: "Erreur d'enregistrement",
        description: error instanceof Error ? error.message : "Impossible de démarrer l'enregistrement",
        variant: "destructive"
      });
    }
  };

  const handleStopRecording = async () => {
    try {
      const recording = await audioRecorder.stopRecording();
      
      // Transcribe immediately
      setIsProcessing(true);
      setProcessingStep('Transcription en cours...');
      
      const transcribedText = await AudioRecorderService.transcribeRecording(recording, sourceLanguage === 'auto' ? undefined : sourceLanguage);
      setTranscription(transcribedText);
      
      // Save to database if needed
      const recordingId = await saveRecording({
        blob: recording.blob,
        duration: recording.duration,
        size: recording.size
      }, `Recording-${new Date().toISOString()}`);
      
      if (recordingId && transcribedText) {
        await saveTranscription(recordingId, transcribedText, sourceLanguage);
        setCurrentRecordingId(recordingId);
      }
      
      loadTranscriptions();
      
      toast({
        title: "Enregistrement terminé",
        description: "Audio transcrit avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'enregistrement",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Translation
  const handleTranslate = async () => {
    if (!transcription.trim()) return;
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text: transcription,
          sourceLang: sourceLanguage === 'auto' ? 'fr' : sourceLanguage,
          targetLang: targetLanguage
        }
      });

      if (error) throw error;
      setTranslation(data.translatedText);
      
      toast({
        title: "Traduction terminée",
        description: "Texte traduit avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur de traduction",
        description: "Impossible de traduire le texte",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Audio export
  const handleExportAudio = async (text: string, filename: string) => {
    if (!text.trim()) return;
    
    setIsGeneratingAudio(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: {
          text,
          voice: selectedVoice,
          format: 'mp3'
        }
      });

      if (error) throw error;
      
      // Convert base64 to blob and download
      const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Audio exporté",
        description: "Fichier téléchargé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer l'audio",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Export transcription as text file
  const exportTranscription = () => {
    if (!transcription.trim()) return;

    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export translation as text file
  const exportTranslation = () => {
    if (!translation.trim()) return;

    const blob = new Blob([translation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-${targetLanguage}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete transcription from history
  const deleteTranscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      loadTranscriptions();
      toast({
        title: "Transcription supprimée",
        description: "L'élément a été supprimé de l'historique.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la transcription.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/app')}
          className="mb-4 hover:bg-muted/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au Chat
        </Button>
        
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Speech-to-Text
          </h1>
          <p className="text-muted-foreground">
            Convertissez vos fichiers audio en texte avec l'IA
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-4">
        {/* Upload Section */}
        <Card className="border-2 border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label>Langue Source</Label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Fichier Audio/Vidéo</Label>
              <div 
                className="border-2 border-dashed border-muted rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Cliquez ou glissez votre fichier ici
                </p>
                <p className="text-xs text-muted-foreground">
                  MP3, WAV, MP4, MOV (max 1GB)
                </p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Recording Controls */}
            <div className="space-y-2">
              <Label>Enregistrement Direct</Label>
              <div className="p-3 border border-muted rounded-lg">
                <AudioRecordingControls
                  recordingState={recordingState}
                  onStartRecording={handleStartRecording}
                  onPauseRecording={() => audioRecorder.pauseRecording()}
                  onResumeRecording={() => audioRecorder.resumeRecording()}
                  onStopRecording={handleStopRecording}
                  isTranscribing={isProcessing}
                  compact={true}
                />
              </div>
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{processingStep}</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcription Result */}
        <Card className="border-2 border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcription ? (
              <div className="space-y-4">
                <Textarea
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  className="min-h-[200px] resize-none"
                  placeholder="La transcription apparaîtra ici..."
                />
                <div className="flex gap-2">
                  <Button onClick={exportTranscription} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    TXT
                  </Button>
                  <Button 
                    onClick={() => handleExportAudio(transcription, 'transcription')}
                    disabled={isGeneratingAudio}
                    size="sm"
                  >
                    <AudioLines className="mr-2 h-4 w-4" />
                    {isGeneratingAudio ? 'Génération...' : 'Audio'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Aucune transcription pour le moment
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Importez un fichier audio pour commencer
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Translation Section */}
        <Card className="border-2 border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Traduction
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcription ? (
              <div className="space-y-4">
                {/* Language and Voice Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Langue cible</Label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TARGET_LANGUAGES).map(([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Voix TTS</Label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TTS_VOICES).map(([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Translate Button */}
                <Button 
                  onClick={handleTranslate} 
                  disabled={isTranslating}
                  className="w-full"
                >
                  <Languages className="mr-2 h-4 w-4" />
                  {isTranslating ? 'Traduction...' : 'Traduire'}
                </Button>

                {/* Translation Result */}
                {translation && (
                  <div className="space-y-2">
                    <Textarea
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      className="min-h-[150px] resize-none"
                      placeholder="La traduction apparaîtra ici..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={exportTranslation} size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        TXT
                      </Button>
                      <Button 
                        onClick={() => handleExportAudio(translation, `translation-${targetLanguage}`)}
                        disabled={isGeneratingAudio}
                        size="sm"
                      >
                        <AudioLines className="mr-2 h-4 w-4" />
                        {isGeneratingAudio ? 'Génération...' : 'Audio'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <Languages className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Aucune transcription à traduire
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Transcrivez d'abord un audio
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-2 border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Masquer' : 'Afficher'}
              </Button>
            </CardTitle>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {transcriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Aucun historique pour le moment
                  </p>
                ) : (
                  transcriptions.map((item) => (
                    <div key={item.id} className="p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.original_text.length > 50 
                              ? `${item.original_text.substring(0, 50)}...` 
                              : item.original_text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {SUPPORTED_LANGUAGES[item.language as keyof typeof SUPPORTED_LANGUAGES] || item.language} • 
                            Confiance: {Math.round(item.confidence * 100)}%
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTranscription(item.id)}
                          className="flex-shrink-0 ml-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTranscription(item.original_text)}
                          className="flex-1"
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Charger
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(item.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}