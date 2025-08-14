import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cpu, Sparkles, Zap, Search, ShieldCheck, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const models = [
  {
    id: "auto-router",
    name: "Auto (Routeur)",
    provider: "Intelligent",
    icon: Search,
    color: "perplexity",
    description: "Choisit le meilleur modèle selon la tâche"
  },
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
  // {
  //   id: "perplexity",
  //   name: "Perplexity",
  //   provider: "Perplexity",
  //   icon: Search,
  //   color: "perplexity",
  //   description: "Recherche web avec IA en temps réel"
  // },
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
  safeMode: boolean;
  onSafeModeChange: (v: boolean) => void;
}

export const ModelSelector = ({ selectedModel, onModelChange, sttProvider, onSttProviderChange, ttsProvider, onTtsProviderChange, ttsVoice, onTtsVoiceChange, personality, onPersonalityChange, safeMode, onSafeModeChange }: ModelSelectorProps & { ttsVoice: string; onTtsVoiceChange: (v: string) => void; }) => {
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 border-b border-border bg-background">
      {/* Modèle principal - toujours visible */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <currentModel.icon className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium text-foreground hidden sm:inline">Modèle :</span>
        </div>
        
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger className="flex-1 sm:w-[200px] lg:w-[280px] bg-secondary border-border text-sm">
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
                <span className="text-foreground truncate">{currentModel.name}</span>
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

      {/* Options rapides mobile/desktop */}
      <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
        {/* Safe mode - toujours visible */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <Switch checked={safeMode} onCheckedChange={onSafeModeChange} className="scale-75 sm:scale-100" />
        </div>

        {/* Options avancées - mobile: popup, desktop: inline */}
        <div className="sm:hidden">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Settings2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Audio & Personnalité</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">STT</span>
                      <Select value={sttProvider} onValueChange={(v) => onSttProviderChange(v as 'openai' | 'google')}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">TTS</span>
                      <Select value={ttsProvider} onValueChange={(v) => onTtsProviderChange(v as 'openai' | 'google')}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Voix</span>
                    <Select value={ttsVoice} onValueChange={onTtsVoiceChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ttsProvider === 'openai' ? (
                          <>
                            <SelectItem value="alloy">alloy</SelectItem>
                            <SelectItem value="ash">ash</SelectItem>
                            <SelectItem value="coral">coral</SelectItem>
                            <SelectItem value="echo">echo</SelectItem>
                            <SelectItem value="sage">sage</SelectItem>
                            <SelectItem value="shimmer">shimmer</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="fr-FR-Standard-A">FR Standard A</SelectItem>
                            <SelectItem value="fr-FR-Wavenet-D">FR Wavenet D</SelectItem>
                            <SelectItem value="en-US-Standard-C">EN Standard C</SelectItem>
                            <SelectItem value="en-US-Wavenet-D">EN Wavenet D</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Personnalité</span>
                    <Select value={personality} onValueChange={onPersonalityChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Neutre</SelectItem>
                        <SelectItem value="nerd">Nerd</SelectItem>
                        <SelectItem value="listener">Écoute</SelectItem>
                        <SelectItem value="cynic">Cynique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Options desktop - cachées sur mobile */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">STT</span>
            <Select value={sttProvider} onValueChange={(v) => onSttProviderChange(v as 'openai' | 'google')}>
              <SelectTrigger className="w-[100px] lg:w-[120px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">TTS</span>
            <Select value={ttsProvider} onValueChange={(v) => onTtsProviderChange(v as 'openai' | 'google')}>
              <SelectTrigger className="w-[100px] lg:w-[120px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Voix</span>
            <Select value={ttsVoice} onValueChange={onTtsVoiceChange}>
              <SelectTrigger className="w-[120px] lg:w-[150px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ttsProvider === 'openai' ? (
                  <>
                    <SelectItem value="alloy">alloy</SelectItem>
                    <SelectItem value="ash">ash</SelectItem>
                    <SelectItem value="coral">coral</SelectItem>
                    <SelectItem value="echo">echo</SelectItem>
                    <SelectItem value="sage">sage</SelectItem>
                    <SelectItem value="shimmer">shimmer</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="fr-FR-Standard-A">FR Standard A</SelectItem>
                    <SelectItem value="fr-FR-Wavenet-D">FR Wavenet D</SelectItem>
                    <SelectItem value="en-US-Standard-C">EN Standard C</SelectItem>
                    <SelectItem value="en-US-Wavenet-D">EN Wavenet D</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Personnalité</span>
            <Select value={personality} onValueChange={onPersonalityChange}>
              <SelectTrigger className="w-[120px] lg:w-[150px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Neutre</SelectItem>
                <SelectItem value="nerd">Nerd</SelectItem>
                <SelectItem value="listener">Écoute</SelectItem>
                <SelectItem value="cynic">Cynique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};