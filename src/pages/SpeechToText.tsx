import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Mic, MicOff, Download, FileText, History, Volume2, Trash2, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AudioRecordingControls } from '@/components/AudioRecordingControls';
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

export default function SpeechToText() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history on component mount
  useEffect(() => {
    loadRecordings();
    loadTranscriptions();
  }, []);

  const loadRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_recordings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Failed to load recordings:', error);
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

    // Check file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille du fichier ne doit pas dépasser 25MB.",
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
        const { error: saveError } = await supabase
          .from('transcriptions')
          .insert({
            user_id: user.id,
            original_text: data.text,
            language: sourceLanguage,
            confidence: 0.9,
            recording_id: crypto.randomUUID()
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

      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-3">
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
                  MP3, WAV, MP4, MOV (max 25MB)
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
                <p className="text-sm text-muted-foreground">
                  Fonctionnalité d'enregistrement bientôt disponible
                </p>
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
                  <Button onClick={exportTranscription} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Exporter TXT
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