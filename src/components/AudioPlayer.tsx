import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Volume2, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  isGenerating?: boolean;
  compact?: boolean;
  showDownload?: boolean;
  downloadFilename?: string;
  className?: string;
}

export function AudioPlayer({
  audioUrl,
  onPlay,
  onPause,
  onEnded,
  isGenerating = false,
  compact = false,
  showDownload = false,
  downloadFilename = 'audio.mp3',
  className
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl, onPlay, onPause, onEnded]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isGenerating) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-muted/30",
        compact ? "text-xs" : "text-sm",
        className
      )}>
        <Loader2 className={cn("animate-spin", compact ? "w-3 h-3" : "w-4 h-4")} />
        <span className="text-muted-foreground">Génération audio...</span>
      </div>
    );
  }

  if (!audioUrl) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg bg-muted/30",
      compact ? "text-xs" : "text-sm",
      className
    )}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <Button
        variant="ghost"
        size={compact ? "sm" : "default"}
        onClick={handlePlayPause}
        disabled={!isLoaded}
        className={cn(
          "p-1",
          compact ? "w-6 h-6" : "w-8 h-8"
        )}
      >
        {isPlaying ? (
          <Pause className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
        ) : (
          <Play className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
        )}
      </Button>

      {!compact && isLoaded && (
        <>
          <div className="flex-1 space-y-1">
            <Progress value={progress} className="h-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </>
      )}

      {compact && isLoaded && (
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      )}

      {showDownload && audioUrl && (
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={handleDownload}
          className={cn(
            "p-1",
            compact ? "w-6 h-6" : "w-8 h-8"
          )}
        >
          <Download className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
        </Button>
      )}

      <Volume2 className={cn(
        "text-muted-foreground",
        compact ? "w-3 h-3" : "w-4 h-4"
      )} />
    </div>
  );
}