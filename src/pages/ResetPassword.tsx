import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/update-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte email pour le lien de réinitialisation.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="mb-4 p-0 h-auto font-normal"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
          </Button>
          
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
            <p className="text-sm text-muted-foreground">
              {sent 
                ? "Un lien de réinitialisation a été envoyé à votre email"
                : "Entrez votre email pour recevoir un lien de réinitialisation"
              }
            </p>
          </div>
        </div>

        {!sent ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email.trim()}
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-primary/10 text-primary rounded-lg">
              <p className="text-sm">
                Un email avec les instructions de réinitialisation a été envoyé à <strong>{email}</strong>
              </p>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Vous n'avez pas reçu l'email ? Vérifiez vos spams ou{" "}
              <button
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                réessayez
              </button>
            </p>

            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Retour à la connexion
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
};

export default ResetPassword;