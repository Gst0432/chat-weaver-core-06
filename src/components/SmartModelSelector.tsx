import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sparkles, Zap, DollarSign, Clock, Brain, Star } from 'lucide-react';
import { ModelRecommendationService, ModelRecommendation, TaskAnalysis } from '@/services/modelRecommendationService';
import { OpenRouterService, OpenRouterModel } from '@/services/openRouterService';

interface SmartModelSelectorProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  prompt?: string;
  className?: string;
}

export const SmartModelSelector: React.FC<SmartModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  prompt = '',
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);
  const [selectedTab, setSelectedTab] = useState<'recommended' | 'all'>('recommended');
  const [taskAnalysis, setTaskAnalysis] = useState<TaskAnalysis | null>(null);
  const [autoMode, setAutoMode] = useState(true);

  const allModels = OpenRouterService.getPopularModels();

  useEffect(() => {
    if (prompt.trim().length > 10) {
      const analysis = ModelRecommendationService.analyzePrompt(prompt);
      setTaskAnalysis(analysis);
      const recs = ModelRecommendationService.getRecommendations(analysis, 5);
      setRecommendations(recs);
      
      if (autoMode && recs.length > 0) {
        onModelSelect(recs[0].model.id);
      }
    }
  }, [prompt, autoMode, onModelSelect]);

  const getModelIcon = (modelId: string) => {
    if (modelId.includes('gpt')) return '🤖';
    if (modelId.includes('claude')) return '🧠';
    if (modelId.includes('gemini')) return '💎';
    if (modelId.includes('llama')) return '🦙';
    return '⭐';
  };

  const getSpeedColor = (speed: 'fast' | 'medium' | 'slow') => {
    switch (speed) {
      case 'fast': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'slow': return 'text-red-600';
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.001) return '< $0.001';
    return `$${price.toFixed(4)}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Auto Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Recommandations IA</span>
        </div>
        <Button
          variant={autoMode ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoMode(!autoMode)}
        >
          {autoMode ? "Auto" : "Manuel"}
        </Button>
      </div>

      {/* Task Analysis */}
      {taskAnalysis && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{taskAnalysis.type}</Badge>
              <Badge variant="outline">{taskAnalysis.complexity} complexité</Badge>
              <Badge variant="outline">{taskAnalysis.length} réponse</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Selector Tabs */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Recommandés ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Tous les modèles ({allModels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <Card 
                key={rec.model.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedModel === rec.model.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onModelSelect(rec.model.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getModelIcon(rec.model.id)}</span>
                        <h3 className="font-semibold text-sm">{rec.model.name}</h3>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">Meilleur choix</Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {rec.matchExplanation}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rec.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <DollarSign className="h-3 w-3" />
                        {formatPrice(rec.estimatedCost)}
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${getSpeedColor(rec.expectedSpeed)}`}>
                        <Clock className="h-3 w-3" />
                        {rec.expectedSpeed}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Brain className="h-3 w-3" />
                        {rec.score}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Tapez votre message pour recevoir des recommandations personnalisées</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all">
          <Select value={selectedModel} onValueChange={onModelSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un modèle" />
            </SelectTrigger>
            <SelectContent>
              {allModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{getModelIcon(model.id)}</span>
                    <span>{model.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatPrice(model.pricing.prompt)}/1K tokens
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TabsContent>
      </Tabs>
    </div>
  );
};