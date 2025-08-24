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
    name: "🤖 Auto (IA Router)",
    provider: "Intelligence",
    icon: Search,
    color: "openai",
    description: "Sélection automatique du meilleur modèle selon la tâche"
  },

  // === 🚀 PHASE 1: GPT-5 OPENROUTER (FLAGSHIP 2025) ===
  {
    id: "openai/gpt-5-2025-08-07",
    name: "🏆 GPT-5 Flagship",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Le flagship GPT-5 via OpenRouter - Capacités révolutionnaires"
  },
  {
    id: "openai/gpt-5-mini-2025-08-07",
    name: "⚡ GPT-5 Mini",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "GPT-5 économique et rapide - Meilleur rapport qualité/prix"
  },
  {
    id: "openai/gpt-5-nano-2025-08-07",
    name: "🚀 GPT-5 Nano",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "GPT-5 ultra-rapide pour réponses instantanées"
  },
  {
    id: "openai/o3-2025-04-16",
    name: "🧠 O3 Reasoning",
    provider: "OpenAI",
    icon: Cpu,
    color: "openai",
    description: "Raisonnement avancé O3 - Analyses complexes"
  },
  {
    id: "openai/o4-mini-2025-04-16",
    name: "⚡ O4 Mini Reasoning",
    provider: "OpenAI",
    icon: Cpu,
    color: "openai",
    description: "Raisonnement rapide et efficace"
  },

  // === 🎯 PHASE 2.1: CLAUDE 4 & ANTHROPIC (TOP TIER) ===
  {
    id: "anthropic/claude-opus-4-20250514",
    name: "👑 Claude Opus 4",
    provider: "Anthropic",
    icon: Sparkles,
    color: "claude",
    description: "Le plus capable - Raisonnement supérieur Claude 4"
  },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "🎯 Claude Sonnet 4",
    provider: "Anthropic",
    icon: Sparkles,
    color: "claude",
    description: "Haute performance - Raisonnement exceptionnel"
  },
  {
    id: "anthropic/claude-3-5-haiku-20241022",
    name: "⚡ Claude 3.5 Haiku",
    provider: "Anthropic",
    icon: Zap,
    color: "claude",
    description: "Le plus rapide - Réponses instantanées"
  },
  {
    id: "anthropic/claude-3-7-sonnet-20250219",
    name: "🤔 Claude 3.7 Sonnet",
    provider: "Anthropic",
    icon: Cpu,
    color: "claude",
    description: "Thinking étendu - Remplacé par Claude 4"
  },
  {
    id: "anthropic/claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    icon: Code2,
    color: "claude",
    description: "Version précédente - Expert programmation"
  },

  // === 🌟 PHASE 2.2: GOOGLE GEMINI (MODÈLES VALIDES UNIQUEMENT) ===
  {
    id: "google/gemini-1.5-pro",
    name: "🚀 Gemini 1.5 Pro",
    provider: "Google",
    icon: Sparkles,
    color: "gemini",
    description: "Modèle le plus capable - 2M tokens contexte"
  },
  {
    id: "google/gemini-1.5-flash",
    name: "⚡ Gemini 1.5 Flash",
    provider: "Google",
    icon: Zap,
    color: "gemini",
    description: "Rapide et économique - 1M tokens"
  },
  {
    id: "google/gemini-1.0-pro",
    name: "📚 Gemini 1.0 Pro",
    provider: "Google",
    icon: Globe,
    color: "gemini",
    description: "Version stable et fiable"
  },

  // === 🦙 PHASE 2.3: META LLAMA 3.3 + VISION ===
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "🆕 Llama 3.3 70B",
    provider: "Meta",
    icon: Code2,
    color: "codestral",
    description: "Dernière version Llama - Améliorations majeures"
  },
  {
    id: "meta-llama/llama-3.2-90b-vision-instruct",
    name: "👁️ Llama 3.2 90B Vision",
    provider: "Meta",
    icon: Sparkles,
    color: "codestral",
    description: "Vision avancée - 90B paramètres"
  },
  {
    id: "meta-llama/llama-3.2-11b-vision-instruct",
    name: "👁️ Llama 3.2 11B Vision",
    provider: "Meta",
    icon: Zap,
    color: "codestral",
    description: "Vision compacte et économique"
  },
  {
    id: "meta-llama/llama-3.1-nemotron-70b-instruct",
    name: "⚡ Llama 3.1 Nemotron 70B",
    provider: "Meta",
    icon: Code2,
    color: "codestral",
    description: "Version optimisée pour performance"
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct-free",
    name: "🆓 Llama 3.1 405B Free",
    provider: "Meta",
    icon: Sparkles,
    color: "codestral",
    description: "Version gratuite du modèle 405B"
  },

  // === 🇫🇷 PHASE 2.4: MISTRAL NOUVEAUX (FRANÇAIS) ===
  {
    id: "mistralai/mistral-large-2411",
    name: "🇫🇷 Mistral Large 2411",
    provider: "Mistral AI",
    icon: Sparkles,
    color: "mistral",
    description: "Dernière version française premium"
  },
  {
    id: "mistralai/pixtral-large-2411",
    name: "🖼️ Pixtral Large 2411",
    provider: "Mistral AI",
    icon: Globe,
    color: "mistral",
    description: "Multimodal français avec vision"
  },
  {
    id: "mistralai/ministral-8b-2410",
    name: "⚡ Ministral 8B",
    provider: "Mistral AI",
    icon: Zap,
    color: "mistral",
    description: "Version compacte française rapide"
  },
  {
    id: "mistralai/ministral-3b-2410",
    name: "🚀 Ministral 3B",
    provider: "Mistral AI",
    icon: Zap,
    color: "mistral",
    description: "Ultra-compact français économique"
  },
  {
    id: "mistralai/codestral-2405",
    name: "💻 Codestral 2405",
    provider: "Mistral AI",
    icon: Code2,
    color: "mistral",
    description: "Expert français en programmation"
  },

  // === 🧠 PHASE 2.5: DEEPSEEK V3 (CHINA TECH) ===
  {
    id: "deepseek/deepseek-v3",
    name: "🚀 DeepSeek V3",
    provider: "DeepSeek",
    icon: Sparkles,
    color: "deepseek",
    description: "Dernière génération - Performances accrues"
  },
  {
    id: "deepseek/deepseek-r1-lite-preview",
    name: "🧠 DeepSeek R1 Lite",
    provider: "DeepSeek",
    icon: Cpu,
    color: "deepseek",
    description: "Raisonnement optimisé preview"
  },
  {
    id: "deepseek/deepseek-coder-v2-lite-instruct",
    name: "💻 DeepSeek Coder V2 Lite",
    provider: "DeepSeek",
    icon: Code2,
    color: "deepseek",
    description: "Code optimisé pour développement"
  },
  {
    id: "deepseek/deepseek-chat",
    name: "💬 DeepSeek Chat (Legacy)",
    provider: "DeepSeek",
    icon: Sparkles,
    color: "deepseek",
    description: "Ancienne version - Utilise DeepSeek V3"
  },
  {
    id: "deepseek/deepseek-reasoner",
    name: "🤔 DeepSeek Reasoner",
    provider: "DeepSeek",
    icon: Cpu,
    color: "deepseek",
    description: "Raisonnement pur et logique"
  },

  // === 🤖 PHASE 3.1: xAI GROK (ELON'S AI) ===
  {
    id: "x-ai/grok-2-1212",
    name: "🚀 Grok 2.1212",
    provider: "xAI",
    icon: Sparkles,
    color: "perplexity",
    description: "Dernière génération Grok avec personnalité"
  },
  {
    id: "x-ai/grok-2-vision-1212",
    name: "👁️ Grok 2 Vision",
    provider: "xAI",
    icon: Globe,
    color: "perplexity",
    description: "Grok avec capacités vision avancées"
  },
  {
    id: "x-ai/grok-beta",
    name: "🧪 Grok Beta",
    provider: "xAI",
    icon: Wrench,
    color: "perplexity",
    description: "Version beta expérimentale"
  },

  // === 🎯 PHASE 3.2: COHERE (ENTERPRISE) ===
  {
    id: "cohere/command-r-plus-08-2024",
    name: "💼 Command R+ 08-2024",
    provider: "Cohere",
    icon: Sparkles,
    color: "mistral",
    description: "Command R+ version enterprise"
  },
  {
    id: "cohere/command-r-08-2024",
    name: "💼 Command R 08-2024",
    provider: "Cohere",
    icon: Code2,
    color: "mistral",
    description: "Command R version standard"
  },
  {
    id: "cohere/command-light",
    name: "⚡ Command Light",
    provider: "Cohere",
    icon: Zap,
    color: "mistral",
    description: "Version légère et économique"
  },

  // === 🌐 PHASE 3.3: PERPLEXITY ÉTENDUS (WEB SEARCH) ===
  {
    id: "perplexity/llama-3.1-sonar-huge-128k-online",
    name: "🌐 Sonar Huge 128K Online",
    provider: "Perplexity",
    icon: Globe,
    color: "perplexity",
    description: "Recherche web - Modèle huge"
  },
  {
    id: "perplexity/llama-3.1-sonar-large-128k-online",
    name: "🌐 Sonar Large 128K Online",
    provider: "Perplexity",
    icon: Globe,
    color: "perplexity",
    description: "Recherche web - Version large"
  },
  {
    id: "perplexity/llama-3.1-sonar-small-128k-online",
    name: "🌐 Sonar Small 128K Online",
    provider: "Perplexity",
    icon: Globe,
    color: "perplexity",
    description: "Recherche web - Version compacte"
  },

  // === 📜 MODÈLES LEGACY (COMPATIBILITÉ) ===
  {
    id: "gpt-5-2025-08-07",
    name: "GPT-5 (Direct)",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "GPT-5 direct - Utilise OpenRouter version"
  },
  {
    id: "gpt-5-mini-2025-08-07",
    name: "GPT-5 Mini (Direct)",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "GPT-5 Mini direct - Utilise OpenRouter version"
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet (Direct)",
    provider: "Anthropic",
    icon: Code2,
    color: "claude",
    description: "Claude direct - Expert programmation"
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash (Direct)",
    provider: "Google AI",
    icon: Zap,
    color: "gemini",
    description: "Gemini direct - 1M tokens context"
  },
  {
    id: "gpt-4o",
    name: "GPT-4o (Legacy)",
    provider: "OpenAI",
    icon: Sparkles,
    color: "openai",
    description: "Ancien modèle - Remplacé par GPT-5"
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (Legacy)",
    provider: "OpenAI",
    icon: Zap,
    color: "openai",
    description: "Ancien modèle rapide - Remplacé par GPT-5 Mini"
  }
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