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
  const navigate = useNavigate();

  useEffect(() => {
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
  }, [navigate]);

  if (!authReady) return null;

  return (
    <ChatLayout>
      <ModelSelector 
        selectedModel={selectedModel} 
        onModelChange={setSelectedModel}
        sttProvider={sttProvider}
        onSttProviderChange={setSttProvider}
        ttsProvider={ttsProvider}
        onTtsProviderChange={setTtsProvider}
      />
      <ChatArea selectedModel={selectedModel} sttProvider={sttProvider} ttsProvider={ttsProvider} />
    </ChatLayout>
  );
};

export default Index;
