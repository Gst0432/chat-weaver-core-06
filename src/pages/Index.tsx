import { useEffect, useState } from "react";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatArea } from "@/components/ChatArea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, Zap } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SimpleCodeGenerator } from "@/components/SimpleCodeGenerator";
import { VideoGenerator } from "@/components/VideoGenerator";
import { useMobileNative } from "@/hooks/use-mobile-native";
import MobileOptimizations from "@/components/MobileOptimizations";

const Index = () => {
  const [selectedModel, setSelectedModel] = useState("openai/gpt-5-mini-2025-08-07");
  const [authReady, setAuthReady] = useState(false);
  const [personality, setPersonality] = useState<string>(localStorage.getItem('personality') || 'default');
  const [safeMode, setSafeMode] = useState<boolean>((localStorage.getItem('safeMode') || 'true') === 'true');
  const [subscription, setSubscription] = useState<any>(null);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [showSaaSGenerator, setShowSaaSGenerator] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const { triggerHapticFeedback } = useMobileNative();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data } = await supabase.functions.invoke('check-subscription');
        setSubscription(data);
        
        // Show subscription prompt if no active subscription
        if (!data?.subscribed) {
          setShowSubscriptionPrompt(true);
        }
      } catch (error) {
        console.error('Erreur vérification abonnement:', error);
        setShowSubscriptionPrompt(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth", { replace: true });
      } else {
        setAuthReady(true);
        checkSubscription();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth", { replace: true });
      else {
        setAuthReady(true);
        checkSubscription();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Effet séparé pour gérer l'événement SaaS Generator
  useEffect(() => {
    const handleToggleSaaS = () => {
      setShowSaaSGenerator(prev => !prev);
    };
    
    const handleToggleVideo = () => {
      setShowVideoGenerator(prev => !prev);
    };
    
    window.addEventListener('chat:toggle-saas-generator', handleToggleSaaS);
    window.addEventListener('chat:toggle-video-generator', handleToggleVideo);
    
    return () => {
      window.removeEventListener('chat:toggle-saas-generator', handleToggleSaaS);
      window.removeEventListener('chat:toggle-video-generator', handleToggleVideo);
    };
  }, []);

  if (!authReady) return null;

  const personalities: Record<string, string> = {
    default: "Tu es un assistant utile et concis.",
    nerd: "Tu es très technique et fournis du code complet lorsque pertinent.",
    listener: "Tu réponds brièvement avec empathie et clarifie les besoins.",
    cynic: "Tu es sarcastique mais utile, en restant professionnel.",
  };

  return (
    <>
      <MobileOptimizations />
      <SidebarProvider>
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
          {/* Subscription Prompt Overlay */}
        {showSubscriptionPrompt && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-primary shadow-elegant">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">Débloquez tout le potentiel de Chatelix</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Accédez à tous les modèles IA premium, générez des images et collaborez en équipe.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Zap className="w-4 h-4 text-primary mr-2" />
                    <span>GPT-4 Turbo + GPT-5 + Deepseek V3</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 text-primary mr-2" />
                    <span>Collaboration d'équipe</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Badge className="w-4 h-4 text-primary mr-2 p-0" />
                    <span>Génération d'images illimitée</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button 
                    onClick={() => navigate('/billing')}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    Voir les forfaits
                  </Button>
                  {/* Essai gratuit désactivé par l'administrateur
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSubscriptionPrompt(false)}
                  >
                    Continuer avec la version gratuite
                  </Button>
                  */}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <AppSidebar />
        
        <div className="flex flex-col flex-1 min-h-screen lg:min-h-0">
          <header className="h-12 flex items-center border-b px-4 bg-background">
            <SidebarTrigger />
            <div className="ml-auto text-sm text-muted-foreground hidden sm:block">
              Chatelix - Assistant IA Multi-Modèles
            </div>
          </header>
          
          <main className="flex-1 flex flex-col bg-background">
            {showSaaSGenerator ? (
              <SimpleCodeGenerator 
                onClose={() => setShowSaaSGenerator(false)}
              />
            ) : showVideoGenerator ? (
              <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Générateur de Vidéo</h1>
                    <Button
                      variant="outline"
                      onClick={() => setShowVideoGenerator(false)}
                    >
                      Retour au chat
                    </Button>
                  </div>
                  <VideoGenerator />
                </div>
              </div>
            ) : (
              <>
                <ModelSelector 
                  selectedModel={selectedModel} 
                  onModelChange={(m) => { setSelectedModel(m); localStorage.setItem('model', m); }}
                  personality={personality}
                  onPersonalityChange={(k) => { setPersonality(k); localStorage.setItem('personality', k); }}
                  safeMode={safeMode}
                  onSafeModeChange={(v) => { setSafeMode(v); localStorage.setItem('safeMode', String(v)); }}
                />
                <ChatArea 
                  selectedModel={selectedModel} 
                  systemPrompt={personalities[personality]} 
                  safeMode={safeMode} 
                />
              </>
            )}
          </main>
        </div>
        </div>
      </SidebarProvider>
    </>
  );
};

export default Index;
