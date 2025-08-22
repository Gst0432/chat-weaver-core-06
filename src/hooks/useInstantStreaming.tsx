import { useState, useCallback, useRef } from 'react';
import { StreamingService, type StreamingOptions } from '@/services/streamingService';
import { PerformanceCache } from '@/services/performanceCache';

export interface UseInstantStreamingOptions {
  onComplete?: (text: string, model: string) => void;
  onError?: (error: Error) => void;
  enableCache?: boolean;
  enablePartialResponse?: boolean;
}

export const useInstantStreaming = (options: UseInstantStreamingOptions = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [timeToFirstChunk, setTimeToFirstChunk] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);

  const startTimeRef = useRef(0);
  const firstChunkTimeRef = useRef(0);
  const chunkCountRef = useRef(0);

  const startStreaming = useCallback(async (streamOptions: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError'>) => {
    console.log('🚀 Starting INSTANT streaming with:', streamOptions.model);
    
    setIsStreaming(true);
    setStreamingText('');
    setCurrentModel(streamOptions.model);
    startTimeRef.current = Date.now();
    firstChunkTimeRef.current = 0;
    chunkCountRef.current = 0;

    // Optimisation 1: Vérifier cache pour réponse partielle
    if (options.enableCache) {
      const promptHash = PerformanceCache.hashPrompt(
        streamOptions.messages[streamOptions.messages.length - 1]?.content || ''
      );
      const cachedResponse = PerformanceCache.getPartialResponse(promptHash);
      
      if (cachedResponse && options.enablePartialResponse) {
        // Afficher immédiatement la réponse cachée
        setStreamingText(cachedResponse);
        console.log('⚡ Using cached partial response');
      }
    }

    const fullOptions: StreamingOptions = {
      ...streamOptions,
      onChunk: (chunk: string) => {
        // Mesurer temps jusqu'au premier chunk
        if (firstChunkTimeRef.current === 0) {
          firstChunkTimeRef.current = Date.now();
          const ttfc = firstChunkTimeRef.current - startTimeRef.current;
          setTimeToFirstChunk(ttfc);
          console.log(`⚡ Time to First Chunk: ${ttfc}ms`);
        }

        chunkCountRef.current++;
        const elapsed = Date.now() - startTimeRef.current;
        const currentSpeed = (chunkCountRef.current / elapsed) * 1000;
        setSpeed(Math.round(currentSpeed));

        setStreamingText(prev => prev + chunk);
      },
      onComplete: (fullText: string) => {
        setIsStreaming(false);
        
        // Cache la réponse pour accélération future
        if (options.enableCache) {
          const promptHash = PerformanceCache.hashPrompt(
            streamOptions.messages[streamOptions.messages.length - 1]?.content || ''
          );
          // Cache les 50 premiers caractères comme réponse partielle
          PerformanceCache.cachePartialResponse(
            promptHash, 
            fullText.substring(0, 50)
          );
        }

        const totalTime = Date.now() - startTimeRef.current;
        console.log(`✅ Streaming completed in ${totalTime}ms - ${chunkCountRef.current} chunks - ${Math.round(speed)} chunks/sec`);
        
        options.onComplete?.(fullText, streamOptions.model);
      },
      onError: (error: Error) => {
        setIsStreaming(false);
        setStreamingText('');
        console.error('❌ Instant streaming error:', error);
        options.onError?.(error);
      }
    };

    try {
      // Utiliser la version optimisée avec fallback intelligent
      await StreamingService.streamWithFallback(fullOptions);
    } catch (error) {
      setIsStreaming(false);
      setStreamingText('');
      options.onError?.(error as Error);
    }
  }, [options]);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingText('');
    setCurrentModel('');
    setTimeToFirstChunk(0);
    setSpeed(0);
    chunkCountRef.current = 0;
  }, []);

  return {
    isStreaming,
    streamingText,
    currentModel,
    timeToFirstChunk,
    speed,
    startStreaming,
    stopStreaming,
    
    // Métriques de performance
    metrics: {
      timeToFirstChunk,
      speed,
      chunkCount: chunkCountRef.current
    }
  };
};