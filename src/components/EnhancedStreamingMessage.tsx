import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Zap,
  Clock,
  DollarSign,
  Brain,
  Wifi,
  WifiOff
} from 'lucide-react';

interface EnhancedStreamingMessageProps {
  content: string;
  model: string;
  isStreaming: boolean;
  onComplete?: (text: string) => void;
  onStop?: () => void;
  estimatedCost?: number;
  confidence?: number;
  speed?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

export const EnhancedStreamingMessage: React.FC<EnhancedStreamingMessageProps> = ({
  content,
  model,
  isStreaming,
  onComplete,
  onStop,
  estimatedCost = 0,
  confidence = 0,
  speed = 1,
  connectionStatus = 'connected'
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(50); // ms per character
  const [progress, setProgress] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const getModelInfo = (modelId: string) => {
    if (modelId.includes('gpt-5')) return { name: 'GPT-5', provider: 'OpenAI', icon: '🤖', color: 'bg-green-500' };
    if (modelId.includes('gpt-4')) return { name: 'GPT-4', provider: 'OpenAI', icon: '🤖', color: 'bg-blue-500' };
    if (modelId.includes('claude')) return { name: 'Claude', provider: 'Anthropic', icon: '🧠', color: 'bg-orange-500' };
    if (modelId.includes('gemini')) return { name: 'Gemini', provider: 'Google', icon: '💎', color: 'bg-purple-500' };
    if (modelId.includes('llama')) return { name: 'Llama', provider: 'Meta', icon: '🦙', color: 'bg-blue-600' };
    return { name: 'AI Model', provider: 'OpenRouter', icon: '⭐', color: 'bg-gray-500' };
  };

  const modelInfo = getModelInfo(model);

  // Typing animation effect
  useEffect(() => {
    if (!isStreaming || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    if (currentIndex < content.length) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const newIndex = prev + 1;
          setDisplayedContent(content.slice(0, newIndex));
          setProgress((newIndex / content.length) * 100);
          return newIndex;
        });
      }, typingSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      onComplete?.(content);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [content, currentIndex, isStreaming, isPaused, typingSpeed, onComplete]);

  // Reset when content changes
  useEffect(() => {
    setCurrentIndex(0);
    setDisplayedContent('');
    setProgress(0);
  }, [content]);

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsPaused(true);
    setCurrentIndex(0);
    setDisplayedContent('');
    setProgress(0);
    onStop?.();
  };

  const handleSkip = () => {
    setCurrentIndex(content.length);
    setDisplayedContent(content);
    setProgress(100);
  };

  const getSpeedLabel = (speed: number) => {
    if (speed > 80) return 'Très rapide';
    if (speed > 50) return 'Rapide';
    if (speed > 20) return 'Normal';
    return 'Lent';
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-3 w-3 text-green-500" />;
      case 'disconnected': return <WifiOff className="h-3 w-3 text-red-500" />;
      case 'reconnecting': return <Wifi className="h-3 w-3 text-yellow-500 animate-pulse" />;
    }
  };

  return (
    <Card className="max-w-full">
      <CardContent className="p-4">
        {/* Header with model info and controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={`${modelInfo.color} text-primary-foreground text-xs`}>
                {modelInfo.icon}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {modelInfo.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {modelInfo.provider}
                </span>
                {getConnectionIcon()}
              </div>
            </div>
          </div>

          {/* Streaming controls */}
          <div className="flex items-center space-x-2">
            {isStreaming && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayPause}
                  className="h-8 w-8 p-0"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 w-8 p-0"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStop}
                  className="h-8 w-8 p-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className="h-8 w-8 p-0"
                >
                  {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress and metrics */}
        {isStreaming && (
          <div className="mb-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{getSpeedLabel(speed)}</span>
                </div>
                {confidence > 0 && (
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    <span>{confidence}% confiance</span>
                  </div>
                )}
                {estimatedCost > 0 && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>${estimatedCost.toFixed(4)}</span>
                  </div>
                )}
              </div>
              <span>{Math.round(progress)}% terminé</span>
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {displayedContent}
          {isStreaming && !isPaused && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </div>

        {/* Streaming status */}
        {isStreaming && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 animate-pulse" />
              <span>
                {isPaused ? 'En pause' : 'Génération en cours...'}
              </span>
            </div>
            
            {/* Speed control */}
            <div className="flex items-center gap-2">
              <span>Vitesse:</span>
              <select
                value={typingSpeed}
                onChange={(e) => setTypingSpeed(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1 text-foreground"
              >
                <option value={20}>Très rapide</option>
                <option value={50}>Rapide</option>
                <option value={100}>Normal</option>
                <option value={200}>Lent</option>
              </select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};