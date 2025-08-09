import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const voicesOpenAI = ["alloy","ash","ballad","coral","echo","sage","shimmer","verse"];
const voicesGoogle = [
  "fr-FR-Standard-A","fr-FR-Wavenet-D","en-US-Standard-C","en-US-Wavenet-D"
];

const Settings = () => {
  const navigate = useNavigate();
  const [sttProvider, setSttProvider] = useState<'openai' | 'google'>("openai");
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'google'>("openai");
  const [ttsVoice, setTtsVoice] = useState<string>("alloy");

  useEffect(() => {
    try {
      const sp = localStorage.getItem('sttProvider') as 'openai' | 'google' | null;
      const tp = localStorage.getItem('ttsProvider') as 'openai' | 'google' | null;
      const tv = localStorage.getItem('ttsVoice');
      if (sp) setSttProvider(sp);
      if (tp) setTtsProvider(tp);
      if (tv) setTtsVoice(tv);
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem('sttProvider', sttProvider);
    localStorage.setItem('ttsProvider', ttsProvider);
    localStorage.setItem('ttsVoice', ttsVoice);
    window.dispatchEvent(new CustomEvent('chat:prefs-updated'));
    navigate('/');
  };

  const voiceOptions = ttsProvider === 'openai' ? voicesOpenAI : voicesGoogle;

  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Paramètres</h1>
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm mb-2">Reconnaissance vocale (STT)</p>
              <Select value={sttProvider} onValueChange={(v) => setSttProvider(v as 'openai' | 'google')}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI Whisper</SelectItem>
                  <SelectItem value="google">Google STT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm mb-2">Synthèse vocale (TTS)</p>
              <Select value={ttsProvider} onValueChange={(v) => setTtsProvider(v as 'openai' | 'google')}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI TTS</SelectItem>
                  <SelectItem value="google">Google TTS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm mb-2">Voix</p>
              <Select value={ttsVoice} onValueChange={(v) => setTtsVoice(v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={save} className="bg-gradient-primary">Enregistrer</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>Annuler</Button>
          </div>
        </Card>
      </section>
    </main>
  );
};

export default Settings;
