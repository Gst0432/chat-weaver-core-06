import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatArea } from "@/components/ChatArea";
import { useState } from "react";
import { 
  MessageSquare, 
  Brain, 
  Zap, 
  Users, 
  Star,
  Check,
  ArrowRight,
  Sparkles,
  CreditCard,
  Shield,
  Heart
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Landing = () => {
  const navigate = useNavigate();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // Chat state for demo
  const [selectedModel, setSelectedModel] = useState("gpt-4-turbo");
  const [sttProvider, setSttProvider] = useState<'openai' | 'google'>("openai");
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'google'>("openai");
  const [ttsVoice, setTtsVoice] = useState<string>("alloy");
  const [personality, setPersonality] = useState<string>('default');
  const [safeMode, setSafeMode] = useState<boolean>(true);

  const personalities: Record<string, string> = {
    default: "Tu es un assistant utile et concis.",
    nerd: "Tu es très technique et fournis du code complet lorsque pertinent.", 
    listener: "Tu réponds brièvement avec empathie et clarifie les besoins.",
    cynic: "Tu es sarcastique mais utile, en restant professionnel.",
  };

  // Plans d'abonnement exactement comme dans /billing
  const plans = [
    {
      id: 'Starter',
      price: 750000, // 7500 FCFA
      users: '1',
      models: '400+ modèles IA via OpenRouter : GPT-5, Claude 4, Llama 3.1 405B, Gemini Pro, Mistral Large + 50 providers',
      images: '10 images DALL·E 3 + Runware / mois',
      tts: 'OpenAI Standard TTS uniquement',
      minutes: '100 min inclus',
      limits: '+50 FCFA/min TTS au-delà, +500 FCFA/image',
      key: 'starter',
      icon: Shield,
      popular: false
    },
    {
      id: 'Pro',
      price: 2200000, // 22000 FCFA
      users: "Jusqu'à 5",
      models: '400+ modèles IA via OpenRouter : GPT-5, Claude 4, Llama 3.1 405B, Gemini Pro, Mistral Large + 50 providers',
      images: '50 images DALL·E 3 + Runware / mois',
      tts: 'OpenAI HD TTS + Google WaveNet',
      minutes: '500 min inclus',
      limits: 'Forfait illimité au-delà, images illimitées',
      key: 'pro',
      icon: Zap,
      popular: true
    },
    {
      id: 'Business',
      price: 5500000, // 55000 FCFA
      users: "Jusqu'à 20",
      models: '400+ modèles IA via OpenRouter : GPT-5, Claude 4, Llama 3.1 405B, Gemini Pro, Mistral Large + 50 providers',
      images: 'Images DALL·E 3 + Runware illimité',
      tts: 'OpenAI HD + Google WaveNet + voix premium',
      minutes: 'Minutes TTS illimité',
      limits: 'Support prioritaire, gestion équipes',
      key: 'business',
      icon: Star,
      popular: false
    },
    {
      id: 'Enterprise',
      price: 0, // Sur devis
      users: 'Illimité',
      models: '400+ modèles IA via OpenRouter : GPT-5, Claude 4, Llama 3.1 405B, Gemini Pro, Mistral Large + 50 providers',
      images: 'Images DALL·E 3 + Runware illimité',
      tts: 'Voix personnalisées + options avancées',
      minutes: 'Minutes TTS illimité',
      limits: 'SLA, support dédié, API complet',
      key: 'enterprise',
      icon: Star,
      popular: false
    },
  ] as const;

  // Minutes supplémentaires comme dans /billing
  const minutePackages = [
    {
      id: "50",
      minutes: 50,
      price: 250000, // 2500 FCFA
      pricePerMinute: 50,
      popular: false,
    },
    {
      id: "100",
      minutes: 100,
      price: 450000, // 4500 FCFA
      pricePerMinute: 45,
      popular: true, // Meilleur rapport
    },
    {
      id: "300",
      minutes: 300,
      price: 1200000, // 12000 FCFA
      pricePerMinute: 40,
      popular: false,
    },
    {
      id: "500",
      minutes: 500,
      price: 1800000, // 18000 FCFA
      pricePerMinute: 36,
      popular: false,
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        {/* Auth Prompt Modal */}
        {showAuthPrompt && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-primary shadow-elegant">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Connectez-vous pour continuer</h3>
                <p className="text-muted-foreground mb-4">
                  Accédez à 400+ modèles IA via OpenRouter : GPT-5, Claude 4, Llama 3.1 405B, Gemini Pro
                </p>
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full bg-gradient-primary hover:shadow-glow"
                  >
                    Se connecter
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAuthPrompt(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row w-full min-h-screen">
          {/* Left side - Chat Interface */}
          <div className="w-full lg:w-2/3 flex flex-col lg:flex-row">
            <AppSidebar 
              isLandingMode={true} 
              onAuthRequired={() => setShowAuthPrompt(true)} 
            />
            
            <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
              <header className="h-12 flex items-center justify-between border-b px-4 bg-background">
                <SidebarTrigger />
                <Button onClick={() => navigate('/auth')} size="sm" className="bg-gradient-primary hover:shadow-glow">
                  Se connecter
                </Button>
              </header>
              
              <main className="flex-1 flex flex-col">
                <ModelSelector 
                  selectedModel={selectedModel} 
                  onModelChange={setSelectedModel}
                  sttProvider={sttProvider}
                  onSttProviderChange={setSttProvider}
                  ttsProvider={ttsProvider}
                  onTtsProviderChange={setTtsProvider}
                  ttsVoice={ttsVoice}
                  onTtsVoiceChange={setTtsVoice}
                  personality={personality}
                  onPersonalityChange={setPersonality}
                  safeMode={safeMode}
                  onSafeModeChange={setSafeMode}
                />
                <ChatArea 
                  selectedModel={selectedModel} 
                  sttProvider={sttProvider} 
                  ttsProvider={ttsProvider} 
                  ttsVoice={ttsVoice} 
                  systemPrompt={personalities[personality]} 
                  safeMode={safeMode} 
                  isLandingMode={true}
                  onAuthRequired={() => setShowAuthPrompt(true)}
                />
              </main>
            </div>
          </div>

          {/* Right side - Real Pricing Plans (Mobile: Full width, Desktop: 1/3) */}
          <div className="w-full lg:w-1/3 bg-secondary/20 border-t lg:border-t-0 lg:border-l border-border">
            <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-h-screen lg:overflow-y-auto">
              <div className="text-center">
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Plans d'abonnement</h2>
                <p className="text-muted-foreground text-sm">Accédez à toutes les fonctionnalités premium</p>
              </div>

              {/* Real Pricing Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
                {plans.map((plan, index) => (
                  <Card key={plan.id} className={`hover:shadow-elegant transition-all duration-300 ${plan.popular ? 'border-primary shadow-elegant' : ''}`}>
                    <CardContent className="p-3 lg:p-4 relative">
                      {plan.popular && (
                        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-xs">
                          Populaire
                        </Badge>
                      )}
                      <div className={`flex items-center justify-between mb-2 lg:mb-3 ${plan.popular ? 'mt-2' : ''}`}>
                        <div className="flex items-center gap-2">
                          <plan.icon className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-sm lg:text-base">{plan.id}</h3>
                        </div>
                        <Badge variant="outline" className="text-xs font-medium">
                          {plan.price === 0 ? 'Sur devis' : `${(plan.price / 100).toLocaleString()} FCFA/mois`}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs text-muted-foreground mb-2 lg:mb-3">
                        <div className="flex items-start gap-2"><Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="leading-tight">Utilisateurs: {plan.users}</span></div>
                        <div className="flex items-start gap-2"><Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="leading-tight">Modèles IA: {plan.models}</span></div>
                        <div className="flex items-start gap-2"><Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="leading-tight">{plan.images}</span></div>
                        <div className="flex items-start gap-2"><Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="leading-tight">Text-to-Voice: {plan.tts}</span></div>
                        <div className="flex items-start gap-2"><Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="leading-tight">{plan.minutes}</span></div>
                        <div className="flex items-start gap-2 text-primary"><Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="leading-tight font-medium">{plan.limits}</span></div>
                      </div>
                      
                      <Button 
                        onClick={() => navigate('/auth')}
                        className={`w-full text-sm ${plan.popular ? 'bg-gradient-primary hover:shadow-glow' : ''}`}
                        size="sm"
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {plan.id === 'Enterprise' ? 'Nous contacter' : 'Choisir ce plan'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {/* Minutes supplémentaires section */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className="font-semibold mb-3 text-center text-sm lg:text-base">Minutes supplémentaires</h3>
                  <p className="text-xs text-muted-foreground text-center mb-3">Achetez des minutes TTS à la demande</p>

                  <div className="grid grid-cols-2 gap-2">
                    {minutePackages.map((pkg) => (
                      <Card key={pkg.id} className={`hover:shadow-elegant transition-all duration-300 ${pkg.popular ? 'border-primary shadow-elegant' : ''}`}>
                        <CardContent className="p-3 text-center relative">
                          {pkg.popular && (
                            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-xs">
                              Meilleur rapport
                            </Badge>
                          )}
                          <div className={`${pkg.popular ? 'mt-3' : 'mt-1'}`}>
                            <div className="text-lg font-bold">{pkg.minutes}</div>
                            <div className="text-xs text-muted-foreground mb-2">minutes</div>
                            <div className="text-sm font-semibold text-primary">{(pkg.price / 100).toLocaleString()} FCFA</div>
                            <div className="text-xs text-muted-foreground mb-3">{pkg.pricePerMinute} FCFA/min</div>
                            <Button 
                              onClick={() => navigate('/auth')}
                              size="sm"
                              className={`w-full text-xs ${pkg.popular ? 'bg-gradient-primary hover:shadow-glow' : ''}`}
                              variant={pkg.popular ? "default" : "outline"}
                            >
                              Acheter
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Features highlight */}
                <Card className="bg-primary/5 border-primary/20 sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-3 lg:p-4">
                    <h4 className="font-semibold mb-2 text-center text-sm lg:text-base">Tous les plans incluent :</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 text-xs lg:text-sm">
                      <div className="flex items-center"><Brain className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>400+ modèles IA</span></div>
                      <div className="flex items-center"><Zap className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>Auto-router intelligent</span></div>
                      <div className="flex items-center"><MessageSquare className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>Interface unifiée</span></div>
                      <div className="flex items-center"><Users className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>Support technique</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 py-4 bg-background/80 backdrop-blur-sm border-t border-border">
          <div className="text-center text-xs text-muted-foreground">
            <span>Conçu avec </span>
            <Heart className="w-3 h-3 inline text-red-500 mx-1" />
            <span> par </span>
            <a 
              href="https://gstartup.pro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              G-STARTUP
            </a>
          </div>
        </footer>
      </div>
    </SidebarProvider>
  );
};

export default Landing;