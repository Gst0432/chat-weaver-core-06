import { useState, useCallback, useRef } from 'react';
import { StreamingService, StreamingOptions } from '@/services/streamingService';
import { ErrorHandlingService } from '@/services/errorHandlingService';
import { ModelRecommendationService } from '@/services/modelRecommendationService';

export interface EnhancedStreamingOptions {
  onComplete?: (text: string, model: string, metrics: StreamingMetrics) => void;
  onError?: (error: Error, errorInfo?: any) => void;
  onFallback?: (originalModel: string, fallbackModel: string) => void;
  onRetry?: (attempt: number, maxRetries: number) => void;
  enableAutoFallback?: boolean;
  enableErrorRecovery?: boolean;
  budgetLimit?: number;
}

export interface StreamingMetrics {
  startTime: number;
  endTime: number;
  totalTime: number;
  tokensPerSecond: number;
  estimatedCost: number;
  retryCount: number;
  fallbackUsed: boolean;
  errorCount: number;
  model: string;
  confidence: number;
}

export const useEnhancedStreaming = (options: EnhancedStreamingOptions = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [metrics, setMetrics] = useState<StreamingMetrics | null>(null);
  const [errorInfo, setErrorInfo] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [speed, setSpeed] = useState(0);

  const retryCount = useRef(0);
  const fallbackHistory = useRef<string[]>([]);
  const startTimeRef = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const calculateConfidence = useCallback((text: string, model: string): number => {
    // Simulation du calcul de confiance basé sur la longueur et le modèle
    let baseConfidence = 70;
    
    if (model.includes('gpt-5') || model.includes('claude-3-5')) baseConfidence = 90;
    else if (model.includes('gpt-4') || model.includes('claude')) baseConfidence = 85;
    else if (model.includes('mini')) baseConfidence = 75;
    
    // Ajustement basé sur la longueur du texte
    const lengthFactor = Math.min(text.length / 500, 1);
    
    return Math.round(baseConfidence + (lengthFactor * 10));
  }, []);

  const calculateSpeed = useCallback((chunkLength: number, timeElapsed: number): number => {
    if (timeElapsed === 0) return 0;
    return Math.round((chunkLength / timeElapsed) * 1000); // caractères par seconde
  }, []);

  const handleError = useCallback(async (error: Error, model: string): Promise<string | null> => {
    const errorInfo = ErrorHandlingService.analyzeError(error);
    setErrorInfo(errorInfo);
    setConnectionStatus('disconnected');

    const recoveryAction = ErrorHandlingService.getRecoveryAction(errorInfo);
    
    if (options.enableErrorRecovery && recoveryAction.action === 'retry' && retryCount.current < 3) {
      retryCount.current++;
      setConnectionStatus('reconnecting');
      options.onRetry?.(retryCount.current, 3);
      
      await new Promise(resolve => setTimeout(resolve, recoveryAction.delay || 1000));
      return model; // Retry avec le même modèle
    }
    
    if (options.enableAutoFallback && recoveryAction.action === 'fallback' && recoveryAction.fallbackModel) {
      const fallbackModel = recoveryAction.fallbackModel;
      if (!fallbackHistory.current.includes(fallbackModel)) {
        fallbackHistory.current.push(fallbackModel);
        options.onFallback?.(model, fallbackModel);
        setConnectionStatus('reconnecting');
        return fallbackModel;
      }
    }

    setConnectionStatus('disconnected');
    options.onError?.(error, errorInfo);
    return null;
  }, [options]);

  const startStreaming = useCallback(async (streamOptions: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError'>) => {
    if (isStreaming) return;

    setIsStreaming(true);
    setStreamingText('');
    setErrorInfo(null);
    setConfidence(0);
    setSpeed(0);
    retryCount.current = 0;
    fallbackHistory.current = [];
    startTimeRef.current = Date.now();

    // Auto-select model if not provided
    let selectedModel = streamOptions.model;
    if (!selectedModel && streamOptions.messages.length > 0) {
      const prompt = streamOptions.messages[streamOptions.messages.length - 1]?.content || '';
      const analysis = ModelRecommendationService.analyzePrompt(prompt);
      selectedModel = ModelRecommendationService.getBestModelForTask(analysis);
    }

    setCurrentModel(selectedModel);
    setConnectionStatus('connected');

    abortController.current = new AbortController();

    const attemptStreaming = async (model: string): Promise<void> => {
      const chunkTimes: number[] = [];
      let lastChunkTime = Date.now();

      const fullOptions: StreamingOptions = {
        ...streamOptions,
        model,
        onChunk: (chunk: string) => {
          const now = Date.now();
          const chunkTime = now - lastChunkTime;
          chunkTimes.push(chunkTime);
          lastChunkTime = now;

          setStreamingText(prev => {
            const newText = prev + chunk;
            setConfidence(calculateConfidence(newText, model));
            setSpeed(calculateSpeed(chunk.length, chunkTime));
            return newText;
          });
        },
        onComplete: (fullText: string) => {
          const endTime = Date.now();
          const totalTime = endTime - startTimeRef.current;
          const avgChunkTime = chunkTimes.length > 0 ? chunkTimes.reduce((a, b) => a + b) / chunkTimes.length : 0;
          
          const finalMetrics: StreamingMetrics = {
            startTime: startTimeRef.current,
            endTime,
            totalTime,
            tokensPerSecond: fullText.length / (totalTime / 1000),
            estimatedCost: 0, // À calculer avec le modèle
            retryCount: retryCount.current,
            fallbackUsed: fallbackHistory.current.length > 0,
            errorCount: retryCount.current,
            model,
            confidence: calculateConfidence(fullText, model)
          };

          setMetrics(finalMetrics);
          setIsStreaming(false);
          setConnectionStatus('connected');
          options.onComplete?.(fullText, model, finalMetrics);
        },
        onError: async (error: Error) => {
          const fallbackModel = await handleError(error, model);
          if (fallbackModel && fallbackModel !== model) {
            setCurrentModel(fallbackModel);
            await attemptStreaming(fallbackModel);
          } else {
            setIsStreaming(false);
            setConnectionStatus('disconnected');
          }
        }
      };

      try {
        await StreamingService.streamGeneration(fullOptions);
      } catch (error) {
        const fallbackModel = await handleError(error as Error, model);
        if (fallbackModel && fallbackModel !== model) {
          setCurrentModel(fallbackModel);
          await attemptStreaming(fallbackModel);
        } else {
          setIsStreaming(false);
          setConnectionStatus('disconnected');
        }
      }
    };

    await attemptStreaming(selectedModel);
  }, [isStreaming, options, calculateConfidence, calculateSpeed, handleError]);

  const stopStreaming = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsStreaming(false);
    setStreamingText('');
    setCurrentModel('');
    setConnectionStatus('connected');
    setMetrics(null);
    setErrorInfo(null);
    retryCount.current = 0;
    fallbackHistory.current = [];
  }, []);

  const pauseStreaming = useCallback(() => {
    // Logic pour pause (à implémenter selon les besoins)
  }, []);

  const resumeStreaming = useCallback(() => {
    // Logic pour resume (à implémenter selon les besoins)
  }, []);

  return {
    // État
    isStreaming,
    streamingText,
    currentModel,
    connectionStatus,
    metrics,
    errorInfo,
    confidence,
    speed,
    
    // Actions
    startStreaming,
    stopStreaming,
    pauseStreaming,
    resumeStreaming,
    
    // Informations
    retryCount: retryCount.current,
    fallbackHistory: fallbackHistory.current
  };
};