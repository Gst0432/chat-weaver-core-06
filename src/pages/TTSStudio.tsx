'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ArrowLeft, Play, Download, Loader, History, Volume2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TextToSpeechService } from '@/services/textToSpeechService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Available TTS voices (OpenAI only)
const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const TTS_FORMATS = ['mp3', 'wav', 'ogg'];

interface TTSHistoryItem {
  id: string;
  text: string;
  voice: string;
  speed: number;
  format: string;
  audio_url: string | null;
  created_at: string;
}

export default function TTSStudio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [text, setText] = useState('');
  const [settings, setSettings] = useState({
    voice: 'alloy',
    speed: 1.0,
    format: 'mp3'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<TTSHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('tts_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Failed to load TTS history:', error);
    }
  };

  // Handle preview (quick generation without saving)
  const handlePreview = async () => {
    const previewText = text.trim() || "Hello, this is a preview of the selected voice.";
    
    setIsPreviewing(true);
    try {
      const result = await TextToSpeechService.generateSpeech(previewText, {
        provider: 'openai',
        voice: settings.voice,
        language: 'en',
        speed: settings.speed,
        format: 'mp3'
      });
      
      // Create blob URL for playback
      const blob = TextToSpeechService.base64ToBlob(result.audioContent, result.mime);
      const url = URL.createObjectURL(blob);
      
      // Play audio directly
      const audio = new Audio(url);
      audio.play();
      
      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      toast({
        title: "Erreur de prévisualisation",
        description: "Impossible de générer la prévisualisation audio.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  // Handle TTS generation with history saving
  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    try {
      const result = await TextToSpeechService.generateSpeech(text, {
        provider: 'openai',
        voice: settings.voice,
        language: 'en',
        speed: settings.speed,
        format: settings.format
      });
      
      // Create blob URL for playback
      const blob = TextToSpeechService.base64ToBlob(result.audioContent, result.mime);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Save to history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('tts_history')
          .insert({
            user_id: user.id,
            text: text.trim(),
            voice: settings.voice,
            speed: settings.speed,
            format: settings.format,
            audio_url: url
          });

        if (error) {
          console.error('Failed to save to history:', error);
        } else {
          loadHistory(); // Refresh history
          toast({
            title: "Audio généré",
            description: "Votre audio a été généré et sauvegardé dans l'historique.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erreur de génération",
        description: "Impossible de générer l'audio. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle audio playback
  const handlePlay = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  // Handle audio download
  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `tts-audio.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Play audio from history
  const playHistoryItem = (item: TTSHistoryItem) => {
    if (item.audio_url) {
      const audio = new Audio(item.audio_url);
      audio.play();
    }
  };

  // Delete history item
  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tts_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      loadHistory();
      toast({
        title: "Élément supprimé",
        description: "L'élément a été supprimé de l'historique.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément.",
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
            Studio TTS
          </h1>
          <p className="text-muted-foreground">
            Convertissez votre texte en parole avec OpenAI
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <Card className="border-2 border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Text Input */}
            <div className="space-y-2">
              <Label htmlFor="text">Texte à convertir</Label>
              <Textarea
                id="text"
                placeholder="Saisissez le texte que vous souhaitez convertir en parole..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px] resize-none border-muted"
              />
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label>Voix OpenAI</Label>
              <Select 
                value={settings.voice} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, voice: value }))}
              >
                <SelectTrigger className="border-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENAI_VOICES.map(voice => (
                    <SelectItem key={voice} value={voice}>
                      {voice.charAt(0).toUpperCase() + voice.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <Label>Vitesse: {settings.speed.toFixed(1)}x</Label>
              <Slider
                value={[settings.speed]}
                onValueChange={(value) => setSettings(prev => ({ ...prev, speed: value[0] }))}
                min={0.25}
                max={4.0}
                step={0.25}
                className="w-full"
              />
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Format Audio</Label>
              <Select 
                value={settings.format} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger className="border-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_FORMATS.map(format => (
                    <SelectItem key={format} value={format}>
                      {format.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handlePreview}
                disabled={isPreviewing}
                variant="outline"
                className="w-full"
              >
                {isPreviewing ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Prévisualisation...
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Prévisualiser
                  </>
                )}
              </Button>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isGenerating ? (
                  <>
                    <Loader className="mr-2 h-5 w-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  'Générer & Sauvegarder'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <Card className="border-2 border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Résultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {audioUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-muted">
                  <p className="text-sm text-muted-foreground mb-3">Audio généré</p>
                  <audio controls className="w-full">
                    <source src={audioUrl} type="audio/mpeg" />
                  </audio>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handlePlay} variant="outline" className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    Écouter
                  </Button>
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
                <p className="text-muted-foreground">
                  Aucun audio généré pour le moment
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
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Aucun historique pour le moment
                  </p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.text.length > 50 ? `${item.text.substring(0, 50)}...` : item.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.voice} • {item.speed}x • {item.format}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHistoryItem(item.id)}
                          className="flex-shrink-0 ml-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playHistoryItem(item)}
                          disabled={!item.audio_url}
                          className="flex-1"
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Écouter
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