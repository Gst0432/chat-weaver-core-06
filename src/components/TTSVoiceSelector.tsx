import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Volume2 } from 'lucide-react';
import { TextToSpeechService, TTSSettings } from '@/services/textToSpeechService';
import { useToast } from '@/hooks/use-toast';

interface TTSVoiceSelectorProps {
  settings: TTSSettings;
  onSettingsChange: (settings: TTSSettings) => void;
  targetLanguage: string;
  className?: string;
}

const TTS_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    voices: {
      'fr': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'en': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'es': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ar': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'de': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'it': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'pt': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ru': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ja': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ko': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'zh': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'hi': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    }
  },
  google: {
    name: 'Google Cloud',
    voices: {
      'fr': ['fr-FR-Neural2-A', 'fr-FR-Neural2-B', 'fr-FR-Neural2-C', 'fr-FR-Neural2-D'],
      'en': ['en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D', 'en-US-Neural2-F'],
      'es': ['es-ES-Neural2-A', 'es-ES-Neural2-B', 'es-ES-Neural2-C', 'es-ES-Neural2-D'],
      'ar': ['ar-XA-Wavenet-A', 'ar-XA-Wavenet-B', 'ar-XA-Wavenet-C'],
      'de': ['de-DE-Neural2-A', 'de-DE-Neural2-B', 'de-DE-Neural2-C', 'de-DE-Neural2-D'],
      'it': ['it-IT-Neural2-A', 'it-IT-Neural2-B', 'it-IT-Neural2-C', 'it-IT-Neural2-D'],
      'pt': ['pt-BR-Neural2-A', 'pt-BR-Neural2-B', 'pt-BR-Neural2-C'],
      'ru': ['ru-RU-Wavenet-A', 'ru-RU-Wavenet-B', 'ru-RU-Wavenet-C', 'ru-RU-Wavenet-D'],
      'ja': ['ja-JP-Neural2-A', 'ja-JP-Neural2-B', 'ja-JP-Neural2-C', 'ja-JP-Neural2-D'],
      'ko': ['ko-KR-Wavenet-A', 'ko-KR-Wavenet-B', 'ko-KR-Wavenet-C'],
      'zh': ['cmn-CN-Wavenet-A', 'cmn-CN-Wavenet-B', 'cmn-CN-Wavenet-C', 'cmn-CN-Wavenet-D'],
      'hi': ['hi-IN-Wavenet-A', 'hi-IN-Wavenet-B', 'hi-IN-Wavenet-C', 'hi-IN-Wavenet-D']
    }
  },
  openrouter: {
    name: 'OpenRouter (OpenAI)',
    voices: {
      'fr': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'en': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'es': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ar': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'de': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'it': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'pt': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ru': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ja': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ko': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'zh': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'hi': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    }
  },
  azure: {
    name: 'Azure Cognitive Services',
    voices: {
      'fr': ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural', 'fr-FR-AlainNeural', 'fr-FR-BrigitteNeural'],
      'en': ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-US-AriaNeural', 'en-US-DavisNeural'],
      'es': ['es-ES-ElviraNeural', 'es-ES-AlvaroNeural', 'es-ES-AbrilNeural', 'es-ES-ArnauNeural'],
      'ar': ['ar-SA-ZariyahNeural', 'ar-SA-HamedNeural', 'ar-EG-SalmaNeural', 'ar-EG-ShakirNeural'],
      'de': ['de-DE-KatjaNeural', 'de-DE-ConradNeural', 'de-DE-AmalaNeural', 'de-DE-BerndNeural'],
      'it': ['it-IT-ElsaNeural', 'it-IT-IsabellaNeural', 'it-IT-DiegoNeural', 'it-IT-BenignoNeural'],
      'pt': ['pt-BR-FranciscaNeural', 'pt-BR-AntonioNeural', 'pt-BR-BrendaNeural', 'pt-BR-DonatoNeural'],
      'ru': ['ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural', 'ru-RU-DariyaNeural', 'ru-RU-PavelNeural'],
      'ja': ['ja-JP-NanamiNeural', 'ja-JP-KeitaNeural', 'ja-JP-AoiNeural', 'ja-JP-DaichiNeural'],
      'ko': ['ko-KR-SunHiNeural', 'ko-KR-InJoonNeural', 'ko-KR-BongJinNeural', 'ko-KR-GookMinNeural'],
      'zh': ['zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-YunyangNeural', 'zh-CN-XiaohanNeural'],
      'hi': ['hi-IN-MadhurNeural', 'hi-IN-SwaraNeural', 'hi-IN-AnanyaNeural', 'hi-IN-KavyaNeural']
    }
  }
};

export function TTSVoiceSelector({ settings, onSettingsChange, targetLanguage, className }: TTSVoiceSelectorProps) {
  const { toast } = useToast();
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Sync TTS language with target language
  useEffect(() => {
    if (settings.language !== targetLanguage) {
      const updatedSettings = { ...settings, language: targetLanguage };
      
      // Reset voice if not available for new language
      const availableVoices = TTS_PROVIDERS[settings.provider]?.voices[targetLanguage] || [];
      if (!availableVoices.includes(settings.voice)) {
        updatedSettings.voice = availableVoices[0] || 'alloy';
      }
      
      onSettingsChange(updatedSettings);
    }
  }, [targetLanguage, settings, onSettingsChange]);

  const handleProviderChange = (provider: keyof typeof TTS_PROVIDERS) => {
    const availableVoices = TTS_PROVIDERS[provider]?.voices[targetLanguage] || [];
    const newVoice = availableVoices[0] || 'alloy';
    
    onSettingsChange({
      ...settings,
      provider,
      voice: newVoice,
      language: targetLanguage
    });
  };

  const handleVoiceChange = (voice: string) => {
    onSettingsChange({
      ...settings,
      voice,
      language: targetLanguage
    });
  };

  const handleSpeedChange = (speed: number[]) => {
    onSettingsChange({
      ...settings,
      speed: speed[0]
    });
  };

  const previewVoice = async () => {
    if (isPreviewPlaying) return;

    setIsPreviewPlaying(true);
    try {
      const previewText = getPreviewText(targetLanguage);
      await TextToSpeechService.playTextAudio(previewText, {
        ...settings,
        language: targetLanguage
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'aperçu vocal",
        variant: "destructive"
      });
    } finally {
      setIsPreviewPlaying(false);
    }
  };

  const getPreviewText = (lang: string): string => {
    const previews: Record<string, string> = {
      'fr': 'Bonjour, ceci est un aperçu de cette voix.',
      'en': 'Hello, this is a preview of this voice.',
      'es': 'Hola, esta es una vista previa de esta voz.',
      'ar': 'مرحبا، هذه معاينة لهذا الصوت.',
      'de': 'Hallo, das ist eine Vorschau dieser Stimme.',
      'it': 'Ciao, questa è un\'anteprima di questa voce.',
      'pt': 'Olá, esta é uma prévia desta voz.',
      'ru': 'Привет, это предварительный просмотр этого голоса.',
      'ja': 'こんにちは、これはこの声のプレビューです。',
      'ko': '안녕하세요, 이것은 이 음성의 미리보기입니다.',
      'zh': '你好，这是这个声音的预览。',
      'hi': 'नमस्ते, यह इस आवाज़ का पूर्वावलोकन है।'
    };
    return previews[lang] || previews['en'];
  };

  const availableVoices = TTS_PROVIDERS[settings.provider]?.voices[targetLanguage] || [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Configuration Narrateur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Fournisseur TTS</label>
          <Select value={settings.provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TTS_PROVIDERS).map(([key, provider]) => (
                <SelectItem key={key} value={key}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Voix</label>
          <div className="flex gap-2">
            <Select value={settings.voice} onValueChange={handleVoiceChange} disabled={availableVoices.length === 0}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice) => (
                  <SelectItem key={voice} value={voice}>
                    {voice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={previewVoice}
              disabled={isPreviewPlaying || availableVoices.length === 0}
            >
              <Play className={`w-4 h-4 ${isPreviewPlaying ? 'animate-pulse' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Vitesse: {settings.speed}x
          </label>
          <Slider
            value={[settings.speed]}
            onValueChange={handleSpeedChange}
            min={0.25}
            max={4.0}
            step={0.25}
            className="w-full"
          />
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Format Audio</label>
          <Select 
            value={settings.format} 
            onValueChange={(format) => onSettingsChange({ ...settings, format: format as 'mp3' | 'wav' | 'opus' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp3">MP3</SelectItem>
              <SelectItem value="wav">WAV</SelectItem>
              <SelectItem value="opus">Opus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        {availableVoices.length === 0 && (
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            Aucune voix disponible pour la langue sélectionnée avec ce fournisseur.
          </div>
        )}
      </CardContent>
    </Card>
  );
}