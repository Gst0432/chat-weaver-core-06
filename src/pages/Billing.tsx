import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

interface SubState {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

const plans = [
  {
    id: 'Starter',
    price: 5000,
    users: '1',
    ttsOpenAI: 'Limitée (100 min)',
    ttsGoogle: 'Non',
    minutes: '100 min inclus',
    overage: '50 FCFA / min',
    key: 'starter'
  },
  {
    id: 'Pro',
    price: 15000,
    users: 'Jusqu\'à 5',
    ttsOpenAI: 'Illimité',
    ttsGoogle: 'Illimité',
    minutes: 'Illimité',
    overage: '-',
    key: 'pro'
  },
  {
    id: 'Business',
    price: 40000,
    users: 'Jusqu\'à 20',
    ttsOpenAI: 'Illimité',
    ttsGoogle: 'Illimité',
    minutes: 'Illimité',
    overage: '-',
    key: 'business'
  },
] as const;

const Billing = () => {
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState<SubState>({ subscribed: false, subscription_tier: null, subscription_end: null });

  const currentPlanKey = useMemo(() => {
    const tier = (sub.subscription_tier || '').toLowerCase();
    if (tier.includes('starter')) return 'starter';
    if (tier.includes('pro')) return 'pro';
    if (tier.includes('business')) return 'business';
    return null;
  }, [sub.subscription_tier]);

  const refresh = async () => {
    const { data, error } = await supabase.functions.invoke('check-subscription');
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setSub(data as SubState);
    }
  };

  const startCheckout = async (planKey: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('moneroo-init', {
        body: { plan: planKey }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url as string, '_blank');
      } else {
        toast({ title: 'Lien indisponible', description: 'Impossible d’ouvrir le paiement.' });
      }
    } catch (e: any) {
      toast({ title: 'Paiement indisponible', description: e?.message || 'Réessayez plus tard.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    toast({ title: 'Portail non disponible', description: 'Avec Moneroo, gérez votre abonnement via un nouvel achat ou une mise à niveau.' });
  };

  useEffect(() => {
    document.title = "Abonnements Chatelix — Starter, Pro, Business";
    setMeta('description', 'Choisissez un abonnement Starter, Pro ou Business pour Chatelix. Paiement mensuel, TTS inclus.');

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('reference') || params.get('moneroo_ref');
    const plan = params.get('plan');

    const verifyIfNeeded = async () => {
      if (ref && plan) {
        const { error } = await supabase.functions.invoke('moneroo-verify', {
          body: { reference: ref, plan }
        });
        if (error) {
          toast({ title: 'Vérification échouée', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Paiement confirmé', description: 'Votre abonnement a été activé.' });
        }
      }
    };

    verifyIfNeeded();
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Abonnements</h1>
        {sub.subscribed ? (
          <p className="text-sm text-muted-foreground mt-2">
            Plan actuel : <span className="font-medium">{sub.subscription_tier || '—'}</span>
            {sub.subscription_end && (
              <> — Renouvellement le {new Date(sub.subscription_end).toLocaleDateString()}</>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">Aucun abonnement actif pour le moment.</p>
        )}
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = currentPlanKey === p.key;
          return (
            <Card key={p.id} className="p-6 bg-card border border-border flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{p.id}</h2>
                {isCurrent && <Badge variant="secondary">Votre plan</Badge>}
              </div>
              <div className="mt-2 text-3xl font-bold">{p.price.toLocaleString()} FCFA<span className="text-base font-normal text-muted-foreground">/mois</span></div>
              <ul className="mt-4 space-y-2 text-sm text-foreground">
                <li>Utilisateurs: {p.users}</li>
                <li>Accès TTS OpenAI: {p.ttsOpenAI}</li>
                <li>Accès TTS Google: {p.ttsGoogle}</li>
                <li>Minutes TTS incluses: {p.minutes}</li>
                <li>Au-delà: {p.overage}</li>
              </ul>
              <div className="mt-6 flex-1" />
              <Button
                disabled={loading || isCurrent}
                onClick={() => startCheckout(p.key)}
                className="w-full"
              >
                {isCurrent ? 'Plan actif' : sub.subscribed ? 'Mettre à niveau' : 'Choisir ce plan'}
              </Button>
            </Card>
          );
        })}
      </section>

      <section className="mt-8 flex items-center gap-3">
        <Button variant="outline" onClick={refresh} disabled={loading}>Actualiser le statut</Button>
        <Button variant="secondary" onClick={openPortal} disabled={loading}>Gérer mon abonnement</Button>
      </section>
    </main>
  );
};

export default Billing;