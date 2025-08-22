import React from 'react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react';
import { OpenRouterModel } from '@/services/openRouterService';

interface PricingIndicatorProps {
  model: OpenRouterModel;
  estimatedTokens?: number;
  promptLength?: number;
  expectedResponseLength?: number;
  budgetLimit?: number;
  showComparison?: boolean;
  className?: string;
}

export const PricingIndicator: React.FC<PricingIndicatorProps> = ({
  model,
  estimatedTokens = 1000,
  promptLength = 100,
  expectedResponseLength = 500,
  budgetLimit,
  showComparison = false,
  className = ''
}) => {
  const promptTokens = Math.ceil(promptLength / 4);
  const responseTokens = Math.ceil(expectedResponseLength / 4);
  const totalTokens = promptTokens + responseTokens;

  const estimatedCost = (promptTokens * model.pricing.prompt) + (responseTokens * model.pricing.completion);
  
  // Catégories de prix
  const getPricingTier = (cost: number): {
    tier: 'economy' | 'standard' | 'premium' | 'expensive';
    color: string;
    label: string;
  } => {
    if (cost < 0.001) return { tier: 'economy', color: 'text-green-600', label: 'Économique' };
    if (cost < 0.01) return { tier: 'standard', color: 'text-blue-600', label: 'Standard' };
    if (cost < 0.05) return { tier: 'premium', color: 'text-orange-600', label: 'Premium' };
    return { tier: 'expensive', color: 'text-red-600', label: 'Coûteux' };
  };

  const pricingTier = getPricingTier(estimatedCost);
  
  // Budget warning
  const isOverBudget = budgetLimit && estimatedCost > budgetLimit;
  const budgetUsage = budgetLimit ? (estimatedCost / budgetLimit) * 100 : 0;

  // Comparaison avec d'autres modèles (simulé)
  const averageModelCost = 0.02; // Coût moyen simulé
  const isAboveAverage = estimatedCost > averageModelCost;
  const costDifference = ((estimatedCost - averageModelCost) / averageModelCost) * 100;

  const formatCost = (cost: number): string => {
    if (cost < 0.0001) return '< $0.0001';
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main cost display */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Coût estimé</span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${pricingTier.color}`}>
                {formatCost(estimatedCost)}
              </div>
              <Badge variant="outline" className={`text-xs ${pricingTier.color}`}>
                {pricingTier.label}
              </Badge>
            </div>
          </div>
          
          {/* Token breakdown */}
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Prompt ({formatNumber(promptTokens)} tokens)</span>
              <span>{formatCost(promptTokens * model.pricing.prompt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Réponse (~{formatNumber(responseTokens)} tokens)</span>
              <span>{formatCost(responseTokens * model.pricing.completion)}</span>
            </div>
            <div className="border-t pt-1 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCost(estimatedCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget warning */}
      {budgetLimit && (
        <Card className={`${isOverBudget ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${isOverBudget ? 'text-red-500' : 'text-yellow-500'}`} />
              <span className="text-sm font-medium">
                {isOverBudget ? 'Budget dépassé' : 'Suivi budget'}
              </span>
            </div>
            <Progress 
              value={Math.min(budgetUsage, 100)} 
              className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatCost(estimatedCost)} / {formatCost(budgetLimit)}</span>
              <span>{budgetUsage.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison with average */}
      {showComparison && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {isAboveAverage ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">Comparaison marché</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {isAboveAverage ? (
                <span className="text-red-600">
                  +{Math.abs(costDifference).toFixed(0)}% au-dessus de la moyenne
                </span>
              ) : (
                <span className="text-green-600">
                  -{Math.abs(costDifference).toFixed(0)}% en-dessous de la moyenne
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing details */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Détails tarifaires</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Prix prompt</span>
              <span>{formatCost(model.pricing.prompt)}/1K tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Prix completion</span>
              <span>{formatCost(model.pricing.completion)}/1K tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Contexte max</span>
              <span>{formatNumber(model.context_length)} tokens</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance indicator */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Performances</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium">Vitesse</div>
              <Badge variant="outline" className="text-xs mt-1">
                {model.id.includes('mini') ? 'Rapide' : 
                 model.id.includes('gpt-5') ? 'Moyenne' : 'Lente'}
              </Badge>
            </div>
            <div className="text-center">
              <div className="font-medium">Qualité</div>
              <Badge variant="outline" className="text-xs mt-1">
                {model.id.includes('gpt-5') || model.id.includes('claude-3-5') ? 'Haute' : 
                 model.id.includes('gpt-4') ? 'Bonne' : 'Standard'}
              </Badge>
            </div>
            <div className="text-center">
              <div className="font-medium">Rapport</div>
              <Badge variant="outline" className="text-xs mt-1">
                {pricingTier.tier === 'economy' ? 'Excellent' :
                 pricingTier.tier === 'standard' ? 'Bon' :
                 pricingTier.tier === 'premium' ? 'Correct' : 'Faible'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};