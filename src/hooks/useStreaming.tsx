import { useState, useCallback } from 'react';
import { StreamingService, type StreamingOptions } from '@/services/streamingService';

export interface UseStreamingOptions {
  onComplete?: (text: string, model: string) => void;
  onError?: (error: Error) => void;
}

export const useStreaming = (options: UseStreamingOptions = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [currentModel, setCurrentModel] = useState<string>('');

  const startStreaming = useCallback(async (streamOptions: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError'>) => {
    setIsStreaming(true);
    setStreamingText('');
    setCurrentModel(streamOptions.model);

    const fullOptions: StreamingOptions = {
      ...streamOptions,
      onChunk: (chunk: string) => {
        setStreamingText(prev => prev + chunk);
      },
      onComplete: (fullText: string) => {
        setIsStreaming(false);
        options.onComplete?.(fullText, streamOptions.model);
      },
      onError: (error: Error) => {
        setIsStreaming(false);
        setStreamingText('');
        options.onError?.(error);
      }
    };

    try {
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
  }, []);

  return {
    isStreaming,
    streamingText,
    currentModel,
    startStreaming,
    stopStreaming
  };
};