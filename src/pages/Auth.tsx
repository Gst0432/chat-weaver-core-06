import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Chatelix – Connexion";

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/", { replace: true });
    });

    // If already logged in, redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Connecté", description: "Connexion réussie." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast({ title: "Vérifiez votre email", description: "Lien de confirmation envoyé." });
    } catch (error: any) {
      toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Se connecter à Chatelix</h1>
          <p className="text-sm text-muted-foreground">Accédez à votre compte pour continuer</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-login">Email</Label>
              <Input id="email-login" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login">Mot de passe</Label>
              <Input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button className="w-full" onClick={signIn} disabled={loading || !email || !password}>Se connecter</Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup">Email</Label>
              <Input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-signup">Mot de passe</Label>
              <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button variant="secondary" className="w-full" onClick={signUp} disabled={loading || !email || !password}>Créer un compte</Button>
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
};

export default Auth;
