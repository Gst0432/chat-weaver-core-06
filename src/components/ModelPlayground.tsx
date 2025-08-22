import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Play, 
  RotateCcw, 
  Download, 
  Share2, 
  Trophy, 
  Clock, 
  DollarSign,
  Zap,
  Brain
} from 'lucide-react';
import { OpenRouterService, OpenRouterModel } from '@/services/openRouterService';
import { EnhancedStreamingMessage } from './EnhancedStreamingMessage';

interface ComparisonResult {
  model: string;
  response: string;
  responseTime: number;
  cost: number;
  isStreaming: boolean;
  isComplete: boolean;
  error?: string;
}

export const ModelPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('compare');

  const allModels = OpenRouterService.getPopularModels();
  const maxModels = 4;

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else if (prev.length < maxModels) {
        return [...prev, modelId];
      }
      return prev;
    });
  };

  const runComparison = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;

    setIsRunning(true);
    setResults([]);

    const initialResults: ComparisonResult[] = selectedModels.map(model => ({
      model,
      response: '',
      responseTime: 0,
      cost: 0,
      isStreaming: true,
      isComplete: false
    }));

    setResults(initialResults);

    // Lancer les requêtes en parallèle
    const promises = selectedModels.map(async (model, index) => {
      const startTime = Date.now();
      
      try {
        const response = await OpenRouterService.generateWithModel(
          [{ role: 'user', content: prompt }],
          model,
          { stream: false }
        );

        const responseTime = Date.now() - startTime;
        const estimatedCost = estimateTokenCost(model, prompt, response.text);

        setResults(prev => prev.map((result, i) => 
          i === index ? {
            ...result,
            response: response.text,
            responseTime,
            cost: estimatedCost,
            isStreaming: false,
            isComplete: true
          } : result
        ));
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        setResults(prev => prev.map((result, i) => 
          i === index ? {
            ...result,
            responseTime,
            isStreaming: false,
            isComplete: true,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          } : result
        ));
      }
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  const estimateTokenCost = (modelId: string, prompt: string, response: string): number => {
    const model = allModels.find(m => m.id === modelId);
    if (!model) return 0;

    const promptTokens = Math.ceil(prompt.length / 4);
    const responseTokens = Math.ceil(response.length / 4);
    
    return (promptTokens * model.pricing.prompt) + (responseTokens * model.pricing.completion);
  };

  const getBestResult = (): ComparisonResult | null => {
    const completedResults = results.filter(r => r.isComplete && !r.error);
    if (completedResults.length === 0) return null;

    // Score basé sur la vitesse, le coût et la longueur de réponse
    return completedResults.reduce((best, current) => {
      const currentScore = (1000 / current.responseTime) + (1 / current.cost) + (current.response.length / 1000);
      const bestScore = (1000 / best.responseTime) + (1 / best.cost) + (best.response.length / 1000);
      return currentScore > bestScore ? current : best;
    });
  };

  const exportResults = () => {
    const data = {
      prompt,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        model: r.model,
        response: r.response,
        responseTime: r.responseTime,
        cost: r.cost,
        error: r.error
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-comparison-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetComparison = () => {
    setResults([]);
    setPrompt('');
    setSelectedModels([]);
  };

  const bestResult = getBestResult();

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Model Playground
          </CardTitle>
          <CardDescription>
            Comparez jusqu'à {maxModels} modèles IA simultanément
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Prompt de test
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Entrez votre prompt pour tester les modèles..."
              className="min-h-[100px]"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Modèles à comparer ({selectedModels.length}/{maxModels})
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {allModels.slice(0, 12).map((model) => (
                <Card
                  key={model.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedModels.includes(model.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleModelToggle(model.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.provider}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ${model.pricing.prompt.toFixed(4)}/1K
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={runComparison}
              disabled={!prompt.trim() || selectedModels.length === 0 || isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'En cours...' : 'Lancer la comparaison'}
            </Button>
            <Button variant="outline" onClick={resetComparison} disabled={isRunning}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            {results.length > 0 && (
              <>
                <Button variant="outline" onClick={exportResults}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="compare">Comparaison</TabsTrigger>
            <TabsTrigger value="metrics">Métriques</TabsTrigger>
            <TabsTrigger value="winner">Gagnant</TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((result, index) => {
                const model = allModels.find(m => m.id === result.model);
                return (
                  <Card key={result.model}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{model?.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {result.isStreaming && (
                            <Badge variant="secondary">En cours...</Badge>
                          )}
                          {result.isComplete && !result.error && (
                            <Badge variant="default">Terminé</Badge>
                          )}
                          {result.error && (
                            <Badge variant="destructive">Erreur</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {result.responseTime > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {result.responseTime}ms
                          </div>
                        )}
                        {result.cost > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${result.cost.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.error ? (
                        <div className="text-red-500 text-sm">
                          ❌ {result.error}
                        </div>
                      ) : result.isStreaming ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Zap className="h-4 w-4 animate-pulse" />
                          Génération en cours...
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {result.response}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Métriques de performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.filter(r => r.isComplete && !r.error).map((result) => {
                    const model = allModels.find(m => m.id === result.model);
                    const maxTime = Math.max(...results.map(r => r.responseTime));
                    const maxCost = Math.max(...results.map(r => r.cost));
                    
                    return (
                      <div key={result.model} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{model?.name}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span>{result.responseTime}ms</span>
                            <span>${result.cost.toFixed(4)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Vitesse</div>
                            <Progress value={(1 - result.responseTime / maxTime) * 100} />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Économie</div>
                            <Progress value={(1 - result.cost / maxCost) * 100} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="winner">
            {bestResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Meilleur modèle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {allModels.find(m => m.id === bestResult.model)?.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {bestResult.responseTime}ms
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${bestResult.cost.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {bestResult.response}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Lancez une comparaison pour voir le gagnant</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};