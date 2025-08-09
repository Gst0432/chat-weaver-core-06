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
];
interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  sttProvider: 'openai' | 'google';
  onSttProviderChange: (p: 'openai' | 'google') => void;
  ttsProvider: 'openai' | 'google';
  onTtsProviderChange: (p: 'openai' | 'google') => void;
  personality: string;
  onPersonalityChange: (key: string) => void;
}

export const ModelSelector = ({ selectedModel, onModelChange, sttProvider, onSttProviderChange, ttsProvider, onTtsProviderChange, ttsVoice, onTtsVoiceChange, personality, onPersonalityChange }: ModelSelectorProps & { ttsVoice: string; onTtsVoiceChange: (v: string) => void; }) => {
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-card/50">
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

      {/* Providers & Voix & Personnalité */}
      <div className="ml-auto flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">STT</span>
          <Select value={sttProvider} onValueChange={(v) => onSttProviderChange(v as 'openai' | 'google')}>
            <SelectTrigger className="w-[140px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI Whisper</SelectItem>
              <SelectItem value="google">Google STT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">TTS</span>
          <Select value={ttsProvider} onValueChange={(v) => onTtsProviderChange(v as 'openai' | 'google')}>
            <SelectTrigger className="w-[140px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI TTS</SelectItem>
              <SelectItem value="google">Google TTS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Voix</span>
          <Select value={ttsVoice} onValueChange={(v) => onTtsVoiceChange(v)}>
            <SelectTrigger className="w-[200px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ttsProvider === 'openai' ? (
                <>
                  <SelectItem value="alloy">alloy</SelectItem>
                  <SelectItem value="ash">ash</SelectItem>
                  <SelectItem value="ballad">ballad</SelectItem>
                  <SelectItem value="coral">coral</SelectItem>
                  <SelectItem value="echo">echo</SelectItem>
                  <SelectItem value="sage">sage</SelectItem>
                  <SelectItem value="shimmer">shimmer</SelectItem>
                  <SelectItem value="verse">verse</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="fr-FR-Standard-A">fr-FR-Standard-A</SelectItem>
                  <SelectItem value="fr-FR-Wavenet-D">fr-FR-Wavenet-D</SelectItem>
                  <SelectItem value="en-US-Standard-C">en-US-Standard-C</SelectItem>
                  <SelectItem value="en-US-Wavenet-D">en-US-Wavenet-D</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Personnalité</span>
          <Select value={personality} onValueChange={onPersonalityChange}>
            <SelectTrigger className="w-[180px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Neutre</SelectItem>
              <SelectItem value="nerd">Nerd (très technique)</SelectItem>
              <SelectItem value="listener">Écoute (empathique)</SelectItem>
              <SelectItem value="cynic">Cynique (sarcastique)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};