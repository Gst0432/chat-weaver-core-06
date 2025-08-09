import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cpu, Sparkles, Zap, Search } from "lucide-react";

const models = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Le plus capable pour les tâches complexes"
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    icon: Zap,
    color: "gemini",
    description: "Rapide et polyvalent"
  },
  {
    id: "perplexity-pro",
    name: "Perplexity Pro",
    provider: "Perplexity",
    icon: Search,
    color: "perplexity",
    description: "Recherche web en temps réel"
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    icon: Cpu,
    color: "openai",
    description: "Généraliste hautes performances (128k contexte)"
  },
  {
    id: "gpt-4.1",
    name: "GTP-5",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Modèle généraliste de pointe"
  },
  {
    id: "gpt-image-1",
    name: "GPT-Image-1",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Génération d'images (1024x1024)"
  }
];
interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export const ModelSelector = ({ selectedModel, onModelChange }: ModelSelectorProps) => {
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="flex items-center gap-3 p-4 border-b border-border bg-card/50">
      <div className="flex items-center gap-2">
        <currentModel.icon className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">Modèle :</span>
      </div>
      
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-[280px] bg-secondary border-border">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`text-xs ${
                  currentModel.color === 'openai' ? 'bg-openai/20 text-openai border-openai/30' :
                  currentModel.color === 'claude' ? 'bg-claude/20 text-claude border-claude/30' :
                  currentModel.color === 'gemini' ? 'bg-gemini/20 text-gemini border-gemini/30' :
                  'bg-perplexity/20 text-perplexity border-perplexity/30'
                }`}
              >
                {currentModel.provider}
              </Badge>
              <span className="text-foreground">{currentModel.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-3 py-1">
                <model.icon className="w-4 h-4" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        model.color === 'openai' ? 'bg-openai/20 text-openai border-openai/30' :
                        model.color === 'claude' ? 'bg-claude/20 text-claude border-claude/30' :
                        model.color === 'gemini' ? 'bg-gemini/20 text-gemini border-gemini/30' :
                        'bg-perplexity/20 text-perplexity border-perplexity/30'
                      }`}
                    >
                      {model.provider}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};