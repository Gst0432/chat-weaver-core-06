import { useState, useCallback } from 'react';

interface YouTubePlayerHook {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  extractVideoId: (url: string) => string | null;
  setVideoId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const useYouTubePlayer = (): YouTubePlayerHook => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const extractVideoId = useCallback((url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }, []);

  return {
    videoId,
    isPlaying,
    currentTime,
    duration,
    extractVideoId,
    setVideoId,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  };
};