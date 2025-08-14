import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cpu, Sparkles, Zap, Search, ShieldCheck, Settings2, Code2, Globe, Wrench } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const models = [
  // === ROUTAGE INTELLIGENT ===
  {
    id: "auto-router",
    name: "Auto (Routeur)",
    provider: "Intelligent",
    icon: Search,
    color: "openai",
    description: "Choisit automatiquement le meilleur modèle selon la tâche"
  },
  
  // === MODÈLES GÉNÉRALISTES ===
  {
    id: "gpt-5-2025-08-07",
    name: "GPT-5",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Le modèle phare d'OpenAI avec recherche web native"
  },
  {
    id: "gpt-5-mini-2025-08-07",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "Version rapide et efficace de GPT-5"
  },
  {
    id: "gpt-5-nano-2025-08-07",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "Version ultra-rapide pour tâches simples"
  },
  {
    id: "gpt-4.1-2025-04-14",
    name: "GPT-4.1",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Modèle GPT-4 fiable et éprouvé"
  },
  {
    id: "gpt-4.1-mini-2025-04-14",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "Version rapide et économique de GPT-4.1"
  },

  // === MODÈLES DE RAISONNEMENT ===
  {
    id: "o3-2025-04-16",
    name: "O3",
    provider: "OpenAI",
    icon: Cpu,
    color: "openai",
    description: "Modèle de raisonnement avancé pour analyses complexes"
  },
  {
    id: "o4-mini-2025-04-16",
    name: "O4 Mini",
    provider: "OpenAI",
    icon: Cpu,
    color: "openai",
    description: "Raisonnement rapide et efficace"
  },

  // === CLAUDE - SPÉCIALISTE CODE ===
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    icon: Code2,
    color: "claude",
    description: "🏆 Expert en programmation, debug et architecture"
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    icon: Zap,
    color: "claude",
    description: "⚡ Version rapide pour code simple et corrections"
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    icon: Sparkles,
    color: "claude",
    description: "💎 Le plus puissant pour projets complexes"
  },

  // === SPÉCIALISTES CODE AVANCÉS ===
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    icon: Code2,
    color: "deepseek",
    description: "🚀 Généraliste hautes performances pour le code"
  },
  {
    id: "codestral-latest",
    name: "Codestral",
    provider: "Mistral AI",
    icon: Wrench,
    color: "mistral",
    description: "🔧 Expert français en programmation et outils"
  },
  {
    id: "llama-3.1-sonar-small-128k-online",
    name: "Perplexity CodeLlama",
    provider: "Perplexity",
    icon: Globe,
    color: "perplexity",
    description: "🌐 Code avec recherche web temps réel"
  },
  {
    id: "llama-3.1-sonar-large-128k-online",
    name: "Perplexity Pro Code",
    provider: "Perplexity",
    icon: Globe,
    color: "perplexity",
    description: "🌐 Version puissante avec recherche web"
  },

  // === GOOGLE GEMINI ===
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google AI",
    icon: Zap,
    color: "gemini",
    description: "Nouveau modèle multimodal avec context 1M tokens et capacités 'thinking'"
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google AI",
    icon: Sparkles,
    color: "gemini",
    description: "Modèle avancé avec raisonnement 'thinking' et context 1M tokens"
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google AI",
    icon: Zap,
    color: "gemini",
    description: "Version ultra-rapide pour tâches simples avec 1M context"
  },

  // === MODÈLES LEGACY ===
  {
    id: "gpt-4o",
    name: "GPT-4o (Legacy)",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Ancien modèle OpenAI - Remplacé par GPT-5"
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (Legacy)",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "Ancien modèle rapide - Remplacé par GPT-5 Mini"
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash (Legacy)",
    provider: "Google",
    icon: Zap,
    color: "gemini",
    description: "IA multimodale rapide avec vision et compréhension"
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro (Legacy)",
    provider: "Google",
    icon: Sparkles,
    color: "gemini",
    description: "Version pro avec capacités étendues et vision"
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
                          currentModel.color === 'deepseek' ? 'bg-deepseek/20 text-deepseek border-deepseek/30' :
                          currentModel.color === 'mistral' ? 'bg-mistral/20 text-mistral border-mistral/30' :
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
                           model.color === 'deepseek' ? 'bg-deepseek/20 text-deepseek border-deepseek/30' :
                           model.color === 'mistral' ? 'bg-mistral/20 text-mistral border-mistral/30' :
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