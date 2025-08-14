import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Brain, Search, Sparkles } from "lucide-react";

interface ModelStatusIndicatorProps {
  selectedModel: string;
  isLoading: boolean;
  autoRouterChoice?: string;
}

export const ModelStatusIndicator = ({ selectedModel, isLoading, autoRouterChoice }: ModelStatusIndicatorProps) => {
  if (!isLoading) return null;

  const getModelIcon = (model: string) => {
    if (model.includes('perplexity')) return Search;
    if (model.includes('gemini')) return Sparkles;
    if (model.includes('o1-') || model.includes('o3-')) return Brain;
    if (model.includes('deepseek')) return Zap;
    if (model.includes('gpt-4o')) return Sparkles;
    return Sparkles;
  };

  const getStatusText = (model: string) => {
    if (model.includes('perplexity')) return 'Recherche web en cours...';
    if (model.includes('gemini')) return 'Traitement multimodal...';
    if (model.includes('o1-') || model.includes('o3-')) return 'Raisonnement complexe...';
    if (model.includes('deepseek')) return 'Analyse de code...';
    if (model.includes('gpt-4o')) return 'Génération intelligente...';
    if (model.includes('gpt-5')) return 'Génération avancée...';
    return 'Génération en cours...';
  };

  const getModelColor = (model: string) => {
    if (model.includes('perplexity')) return 'bg-perplexity/10 text-perplexity border-perplexity/20';
    if (model.includes('gemini')) return 'bg-gemini/10 text-gemini border-gemini/20';
    if (model.includes('deepseek')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (model.includes('o1-') || model.includes('o3-')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-openai/10 text-openai border-openai/20';
  };

  const effectiveModel = selectedModel === 'auto-router' && autoRouterChoice ? autoRouterChoice : selectedModel;
  const Icon = getModelIcon(effectiveModel);

  return (
    <div className="flex items-center justify-center py-2">
      <Badge variant="outline" className={`${getModelColor(effectiveModel)} flex items-center gap-2 px-3 py-1.5`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">
          {selectedModel === 'auto-router' && autoRouterChoice ? 
            `Auto → ${getStatusText(autoRouterChoice)}` : 
            getStatusText(effectiveModel)
          }
        </span>
      </Badge>
    </div>
  );
};