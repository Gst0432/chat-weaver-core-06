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

const Index = () => {
  const [selectedModel, setSelectedModel] = useState("gpt-4-turbo");
  const [authReady, setAuthReady] = useState(false);
  const [sttProvider, setSttProvider] = useState<'openai' | 'google'>("openai");
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'google'>("openai");
  const [ttsVoice, setTtsVoice] = useState<string>("alloy");
  const [personality, setPersonality] = useState<string>(localStorage.getItem('personality') || 'default');
  const [safeMode, setSafeMode] = useState<boolean>((localStorage.getItem('safeMode') || 'true') === 'true');
  const [subscription, setSubscription] = useState<any>(null);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Charger préférences locales d'abord
    try {
      const sp = localStorage.getItem('sttProvider') as 'openai' | 'google' | null;
      const tp = localStorage.getItem('ttsProvider') as 'openai' | 'google' | null;
      const tv = localStorage.getItem('ttsVoice');
      if (sp) setSttProvider(sp);
      if (tp) setTtsProvider(tp);
      if (tv) setTtsVoice(tv);
    } catch {}

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

    // Écoute maj préférences depuis la page Paramètres
    const onPrefs = () => {
      try {
        const sp = localStorage.getItem('sttProvider') as 'openai' | 'google' | null;
        const tp = localStorage.getItem('ttsProvider') as 'openai' | 'google' | null;
        const tv = localStorage.getItem('ttsVoice');
        if (sp) setSttProvider(sp);
        if (tp) setTtsProvider(tp);
        if (tv) setTtsVoice(tv!);
      } catch {}
    };
    window.addEventListener('chat:prefs-updated', onPrefs);

    return () => {
      window.removeEventListener('chat:prefs-updated', onPrefs);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!authReady) return null;

  const personalities: Record<string, string> = {
    default: "Tu es un assistant utile et concis.",
    nerd: "Tu es très technique et fournis du code complet lorsque pertinent.",
    listener: "Tu réponds brièvement avec empathie et clarifie les besoins.",
    cynic: "Tu es sarcastique mais utile, en restant professionnel.",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSubscriptionPrompt(false)}
                  >
                    Continuer avec la version gratuite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <AppSidebar />
        
        <div className="flex flex-col flex-1">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
          </header>
          
          <main className="flex-1 flex flex-col">
            <ModelSelector 
              selectedModel={selectedModel} 
              onModelChange={(m) => { setSelectedModel(m); localStorage.setItem('model', m); }}
              sttProvider={sttProvider}
              onSttProviderChange={(v) => { setSttProvider(v); localStorage.setItem('sttProvider', v); }}
              ttsProvider={ttsProvider}
              onTtsProviderChange={(v) => { setTtsProvider(v); localStorage.setItem('ttsProvider', v); }}
              ttsVoice={ttsVoice}
              onTtsVoiceChange={(v) => { setTtsVoice(v); localStorage.setItem('ttsVoice', v); }}
              personality={personality}
              onPersonalityChange={(k) => { setPersonality(k); localStorage.setItem('personality', k); }}
              safeMode={safeMode}
              onSafeModeChange={(v) => { setSafeMode(v); localStorage.setItem('safeMode', String(v)); }}
            />
            <ChatArea 
              selectedModel={selectedModel} 
              sttProvider={sttProvider} 
              ttsProvider={ttsProvider} 
              ttsVoice={ttsVoice} 
              systemPrompt={personalities[personality]} 
              safeMode={safeMode} 
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
