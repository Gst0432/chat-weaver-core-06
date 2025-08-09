import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const Team = () => {
  const [email, setEmail] = useState("");

  useEffect(() => {
    document.title = "Équipe | Chatelix"; // SEO title
    setMeta("description", "Gérez votre équipe et invitez des membres par e‑mail sur Chatelix.");
  }, []);

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Ici, on implémentera l'invitation (Supabase/Edge Function) plus tard
    console.info("Invitation envoyée (fictive)", email);
    setEmail("");
  };

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Équipe – Gestion et invitations</h1>
      </header>

      <section aria-labelledby="invite" className="mb-6">
        <h2 id="invite" className="sr-only">Inviter un membre</h2>
        <Card className="p-6 bg-card border border-border">
          <form onSubmit={onInvite} className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <Label htmlFor="email">Ajouter un membre par e‑mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="utilisateur@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="sm:ml-2">Inviter</Button>
          </form>
        </Card>
      </section>

      <section aria-labelledby="members">
        <h2 id="members" className="text-lg font-medium text-foreground mb-3">Membres de l'équipe</h2>
        <Card className="p-6 bg-card border border-border">
          <p className="text-sm text-muted-foreground">Votre équipe s'affichera ici.</p>
        </Card>
      </section>
    </main>
  );
};

export default Team;
