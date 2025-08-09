import { useEffect, useState } from "react";
import { ChatLayout } from "@/components/ChatLayout";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatArea } from "@/components/ChatArea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [selectedModel, setSelectedModel] = useState("gpt-4-turbo");
  const [authReady, setAuthReady] = useState(false);
  const [sttProvider, setSttProvider] = useState<'openai' | 'google'>("openai");
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'google'>("openai");
  const [ttsVoice, setTtsVoice] = useState<string>("alloy");
  const [personality, setPersonality] = useState<string>(localStorage.getItem('personality') || 'default');
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth", { replace: true });
      } else {
        setAuthReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth", { replace: true });
      else setAuthReady(true);
    });

    return () => subscription.unsubscribe();
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
    <ChatLayout>
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
      />
      <ChatArea selectedModel={selectedModel} sttProvider={sttProvider} ttsProvider={ttsProvider} ttsVoice={ttsVoice} systemPrompt={personalities[personality]} />
    </ChatLayout>
  );
};

export default Index;
