import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ChatLayout } from "@/components/ChatLayout";
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
  Shield
} from "lucide-react";

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

  // Real subscription plans from Billing
  const plans = [
    {
      id: 'Starter',
      price: 7500,
      users: '1',
      models: 'GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini',
      images: '10 images / mois',
      tts: 'OpenAI Standard TTS uniquement',
      minutes: '100 min inclus',
      limits: '+50 FCFA/min TTS au-delà, +500 FCFA/image',
      key: 'starter',
      icon: Shield,
      popular: false
    },
    {
      id: 'Pro', 
      price: 22000,
      users: "Jusqu'à 5",
      models: 'GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini',
      images: '50 images / mois',
      tts: 'OpenAI HD TTS + Google WaveNet',
      minutes: '500 min inclus',
      limits: 'Forfait illimité au-delà, images illimitées',
      key: 'pro',
      icon: Zap,
      popular: true
    },
    {
      id: 'Business',
      price: 55000,
      users: "Jusqu'à 20",
      models: 'GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini',
      images: 'Illimité',
      tts: 'OpenAI HD + Google WaveNet + voix premium',
      minutes: 'Illimité',
      limits: 'Support prioritaire, gestion équipes',
      key: 'business',
      icon: Star,
      popular: false
    },
    {
      id: 'Enterprise',
      price: 0,
      users: 'Illimité',
      models: 'GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini',
      images: 'Illimité',
      tts: 'Voix personnalisées + options avancées',
      minutes: 'Illimité',
      limits: 'SLA, support dédié, API complet',
      key: 'enterprise',
      icon: Star,
      popular: false
    },
  ] as const;

  const features = [
    {
      icon: MessageSquare,
      title: "Chat Multi-API",
      description: "Accédez à GPT-4 Turbo, GPT-5, Deepseek V3, et Gemini dans une seule plateforme"
    },
    {
      icon: Brain,
      title: "IA Avancée",
      description: "Bénéficiez des dernières avancées en intelligence artificielle"
    },
    {
      icon: Zap,
      title: "Ultra Rapide",
      description: "Responses instantanées avec nos serveurs optimisés"
    },
    {
      icon: Users,
      title: "Collaboration d'équipe",
      description: "Travaillez ensemble avec vos collègues sur vos projets IA"
    }
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Développeuse",
      content: "Chatelix a révolutionné ma façon de travailler avec l'IA. Une seule plateforme pour tous mes besoins.",
      rating: 5
    },
    {
      name: "Thomas Martin", 
      role: "Chef de projet",
      content: "L'interface est intuitive et les résultats sont impressionnants. Je recommande vivement !",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
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
                Accédez aux meilleurs modèles IA : GPT-4 Turbo, GPT-5, Deepseek V3, Gemini
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

      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Chatelix</span>
          </div>
          <Button onClick={() => navigate('/auth')} className="bg-gradient-primary hover:shadow-glow">
            Se connecter
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
        {/* Left side - Interactive Chat */}
        <div className="lg:w-2/3 border-r border-border">
          <div className="h-full">
            <ChatLayout>
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
            </ChatLayout>
          </div>
        </div>

        {/* Right side - Real Pricing Plans */}
        <div className="lg:w-1/3 p-6 bg-secondary/20">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choisissez votre plan</h2>
              <p className="text-muted-foreground text-sm">Accès instantané après connexion</p>
            </div>

            {/* Real Pricing Cards */}
            <div className="space-y-4">
              {plans.map((plan, index) => (
                <Card key={plan.id} className={`hover:shadow-elegant transition-all duration-300 ${plan.popular ? 'border-primary shadow-elegant' : ''}`}>
                  <CardContent className="p-4 relative">
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-xs">
                        Populaire
                      </Badge>
                    )}
                    <div className={`flex items-center justify-between mb-3 ${plan.popular ? 'mt-2' : ''}`}>
                      <div className="flex items-center gap-2">
                        <plan.icon className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">{plan.id}</h3>
                      </div>
                      <Badge variant="outline">
                        {plan.price === 0 ? 'Sur mesure' : `${(plan.price / 100).toFixed(0)} FCFA/mois`}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center"><Check className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>{plan.users} utilisateur{plan.users !== '1' ? 's' : ''}</span></div>
                      <div className="flex items-center"><Check className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>{plan.images}</span></div>
                      <div className="flex items-center"><Check className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>{plan.minutes}</span></div>
                      <div className="flex items-center"><Check className="w-3 h-3 text-primary mr-2 flex-shrink-0" /><span>{plan.tts}</span></div>
                    </div>
                    
                    <Button 
                      onClick={() => navigate('/auth')}
                      className={`w-full ${plan.popular ? 'bg-gradient-primary hover:shadow-glow' : ''}`}
                      size="sm"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Choisir ce plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Features highlight */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 text-center">Tous les plans incluent :</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center"><Brain className="w-3 h-3 text-primary mr-2" />GPT-4 Turbo + GPT-5</div>
                  <div className="flex items-center"><Zap className="w-3 h-3 text-primary mr-2" />Deepseek V3 + Gemini</div>
                  <div className="flex items-center"><MessageSquare className="w-3 h-3 text-primary mr-2" />Interface unifiée</div>
                  <div className="flex items-center"><Users className="w-3 h-3 text-primary mr-2" />Support 24/7</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;