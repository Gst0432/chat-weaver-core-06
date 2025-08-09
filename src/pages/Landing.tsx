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
  CreditCard
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  
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
        {/* Left side - Chat Demo */}
        <div className="lg:w-2/3 border-r border-border">
          <div className="h-full relative">
            {/* Demo overlay */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <Card className="max-w-md w-full mx-4 border-primary shadow-elegant">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Connectez-vous pour commencer</h3>
                  <p className="text-muted-foreground mb-4">
                    Accédez aux meilleurs modèles IA : GPT-4 Turbo, GPT-5, Deepseek V3, Gemini
                  </p>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full bg-gradient-primary hover:shadow-glow"
                  >
                    Se connecter
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Chat interface (blurred demo) */}
            <div className="filter blur-sm pointer-events-none">
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
                />
              </ChatLayout>
            </div>
          </div>
        </div>

        {/* Right side - Pricing Plans */}
        <div className="lg:w-1/3 p-6 bg-secondary/20">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choisissez votre plan</h2>
              <p className="text-muted-foreground text-sm">Accès instantané après connexion</p>
            </div>

            {/* Pricing Cards */}
            <div className="space-y-4">
              {/* Starter */}
              <Card className="hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Starter</h3>
                    <Badge variant="outline">5€/mois</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />1 utilisateur</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />Tous les modèles IA</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />50 images/mois</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />100 min TTS</li>
                  </ul>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full"
                    size="sm"
                  >
                    Choisir ce plan
                  </Button>
                </CardContent>
              </Card>

              {/* Pro */}
              <Card className="border-primary shadow-elegant">
                <CardContent className="p-4 relative">
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-xs">
                    Populaire
                  </Badge>
                  <div className="flex items-center justify-between mb-3 mt-2">
                    <h3 className="font-semibold">Pro</h3>
                    <Badge variant="outline">15€/mois</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />5 utilisateurs</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />Tous les modèles IA</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />200 images/mois</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />500 min TTS</li>
                  </ul>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full bg-gradient-primary hover:shadow-glow"
                    size="sm"
                  >
                    Choisir ce plan
                  </Button>
                </CardContent>
              </Card>

              {/* Business */}
              <Card className="hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Business</h3>
                    <Badge variant="outline">35€/mois</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />20 utilisateurs</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />Tous les modèles IA</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />500 images/mois</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />1500 min TTS</li>
                  </ul>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full"
                    size="sm"
                  >
                    Choisir ce plan
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card className="hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Enterprise</h3>
                    <Badge variant="outline">75€/mois</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />Utilisateurs illimités</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />Tous les modèles IA</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />2000 images/mois</li>
                    <li className="flex items-center"><Check className="w-3 h-3 text-primary mr-2" />5000 min TTS</li>
                  </ul>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full"
                    size="sm"
                  >
                    Choisir ce plan
                  </Button>
                </CardContent>
              </Card>
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