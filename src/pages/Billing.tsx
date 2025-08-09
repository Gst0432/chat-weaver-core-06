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

const Billing = () => {
  const [amount, setAmount] = useState<number>(1000);

  useEffect(() => {
    document.title = "Abonnement & Tokens | Chatelix"; // SEO title
    setMeta("description", "Gérez votre abonnement et achetez des tokens pour Chatelix en toute simplicité.");
  }, []);

  const onPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    // Intégration paiement (ex: Stripe) pourra être ajoutée ici ultérieurement
    console.info("Achat de tokens (fictif)", amount);
  };

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Abonnement et achat de tokens</h1>
      </header>

      <section aria-labelledby="plan" className="mb-6">
        <h2 id="plan" className="text-lg font-medium text-foreground mb-3">Votre plan</h2>
        <Card className="p-6 bg-card border border-border">
          <p className="text-sm text-muted-foreground">Plan actuel : Gratuit</p>
        </Card>
      </section>

      <section aria-labelledby="purchase">
        <h2 id="purchase" className="text-lg font-medium text-foreground mb-3">Acheter des tokens</h2>
        <Card className="p-6 bg-card border border-border">
          <form onSubmit={onPurchase} className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <Label htmlFor="amount">Montant des tokens</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))}
              />
            </div>
            <Button type="submit" className="sm:ml-2">Acheter</Button>
          </form>
        </Card>
      </section>
    </main>
  );
};

export default Billing;
