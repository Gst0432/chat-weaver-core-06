import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Zap, Shield, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  minutes_balance?: number;
}

interface MinutePackage {
  id: string;
  minutes: number;
  price: number;
  pricePerMinute: number;
  popular?: boolean;
}

const minutePackages: MinutePackage[] = [
  {
    id: "50",
    minutes: 50,
    price: 2500,
    pricePerMinute: 50,
  },
  {
    id: "100",
    minutes: 100,
    price: 4500,
    pricePerMinute: 45,
    popular: true,
  },
  {
    id: "300",
    minutes: 300,
    price: 12000,
    pricePerMinute: 40,
  },
  {
    id: "500",
    minutes: 500,
    price: 18000,
    pricePerMinute: 36,
  },
];

const plans = [
  {
    id: 'Starter',
    price: 7500,
    users: '1',
    models: 'GPT-5 + GPT-4.1 + O3 + O4-Mini + Deepseek V3 + Gemini Pro + Perplexity',
    images: '10 images / mois',
    tts: 'OpenAI Standard TTS uniquement',
    minutes: '100 min inclus',
    limits: '+50 FCFA/min TTS au-delà, +500 FCFA/image',
    key: 'starter',
    icon: Shield,
    popular: false
  },
  {
    id: 'Pro',
    price: 22000,
    users: "Jusqu'à 5",
    models: 'GPT-5 + GPT-4.1 + O3 + O4-Mini + Deepseek V3 + Gemini Pro + Perplexity',
    images: '50 images / mois',
    tts: 'OpenAI HD TTS + Google WaveNet',
    minutes: '500 min inclus',
    limits: 'Forfait illimité au-delà, images illimitées',
    key: 'pro',
    icon: Zap,
    popular: true
  },
  {
    id: 'Business',
    price: 55000,
    users: "Jusqu'à 20",
    models: 'GPT-5 + GPT-4.1 + O3 + O4-Mini + Deepseek V3 + Gemini Pro + Perplexity',
    images: 'Illimité',
    tts: 'OpenAI HD + Google WaveNet + voix premium',
    minutes: 'Illimité',
    limits: 'Support prioritaire, gestion équipes',
    key: 'business',
    icon: Star,
    popular: false
  },
  {
    id: 'Enterprise',
    price: 0,
    users: 'Illimité',
    models: 'GPT-5 + GPT-4.1 + O3 + O4-Mini + Deepseek V3 + Gemini Pro + Perplexity',
    images: 'Illimité',
    tts: 'Voix personnalisées + options avancées',
    minutes: 'Illimité',
    limits: 'SLA, support dédié, API complet',
    key: 'enterprise',
    icon: Star,
    popular: false
  },
] as const;

const Billing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [minutesLoading, setMinutesLoading] = useState(false);
  const [sub, setSub] = useState<SubState>({ 
    subscribed: false, 
    subscription_tier: null, 
    subscription_end: null,
    minutes_balance: 0
  });

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
      if (planKey === 'enterprise') {
        window.location.href = 'mailto:contact@chatelix.app?subject=Demande%20Enterprise%20(Devis)';
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('moneroo-init', {
        body: { plan: planKey }
      });
      if (error) throw error;
      if (data?.url) {
        const w = window.open(data.url as string, '_blank');
        if (!w) {
          window.location.href = data.url as string;
        }
      } else {
        toast({ title: 'Lien indisponible', description: 'Impossible d\'ouvrir le paiement.' });
      }
    } catch (e: any) {
      toast({ title: 'Paiement indisponible', description: e?.message || 'Réessayez plus tard.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const purchaseMinutes = async (packageId: string) => {
    try {
      setMinutesLoading(true);
      const { data, error } = await supabase.functions.invoke('moneroo-minutes-init', {
        body: { minutes: packageId }
      });
      if (error) throw error;
      if (data?.url) {
        const w = window.open(data.url as string, '_blank');
        if (!w) {
          window.location.href = data.url as string;
        }
      } else {
        toast({ title: 'Lien indisponible', description: 'Impossible d\'ouvrir le paiement.' });
      }
    } catch (e: any) {
      toast({ title: 'Achat indisponible', description: e?.message || 'Réessayez plus tard.', variant: 'destructive' });
    } finally {
      setMinutesLoading(false);
    }
  };

  const handlePaymentVerification = async () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const paymentId = params.get('paymentId');
    const paymentStatus = params.get('paymentStatus');
    const minutes = params.get('minutes');
    const ref = params.get('ref') || params.get('reference') || params.get('moneroo_ref');
    const plan = params.get('plan');
    
    if (paymentId && paymentStatus) {
      if (paymentStatus === 'success' || status === 'success') {
        if (minutes) {
          // Minute purchase verification
          const { error } = await supabase.functions.invoke('moneroo-minutes-verify', {
            body: { reference: paymentId, minutes: Number(minutes) }
          });
          if (error) {
            toast({ title: 'Vérification échouée', description: error.message, variant: 'destructive' });
          } else {
            toast({ title: 'Achat confirmé', description: `${minutes} minutes ajoutées à votre compte.` });
          }
        } else {
          // Subscription purchase verification
          const planFromUrl = plan || 'starter';
          const { error } = await supabase.functions.invoke('moneroo-verify', {
            body: { reference: paymentId, plan: planFromUrl }
          });
          if (error) {
            toast({ title: 'Vérification échouée', description: error.message, variant: 'destructive' });
          } else {
            toast({ title: 'Paiement confirmé', description: 'Votre abonnement a été activé.' });
          }
        }
      } else {
        toast({ 
          title: 'Paiement échoué', 
          description: 'Le paiement n\'a pas été complété avec succès.',
          variant: 'destructive' 
        });
      }
      
      // Clean URL parameters
      const url = new URL(window.location.href);
      ['status', 'paymentId', 'paymentStatus', 'plan', 'minutes'].forEach(param => {
        url.searchParams.delete(param);
      });
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''));
    }
    
    // Keep backward compatibility with old ref/plan parameters
    else if (ref && plan) {
      const { error } = await supabase.functions.invoke('moneroo-verify', {
        body: { reference: ref, plan }
      });
      if (error) {
        toast({ title: 'Vérification échouée', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Paiement confirmé', description: 'Votre abonnement a été activé.' });
      }
      
      const url = new URL(window.location.href);
      ['ref', 'reference', 'moneroo_ref', 'plan'].forEach(param => {
        url.searchParams.delete(param);
      });
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''));
    }
  };

  useEffect(() => {
    document.title = "Abonnements Chatelix — Starter, Pro, Business";
    setMeta('description', 'Choisissez un abonnement Starter, Pro ou Business pour Chatelix. Paiement mensuel, TTS inclus.');

    handlePaymentVerification();
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header with back button */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/app")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Abonnements Chatelix
              </h1>
              <p className="text-sm text-muted-foreground">
                Choisissez le plan qui vous convient
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-6 py-8 space-y-12">
        {/* Current subscription status */}
        {sub.subscribed && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Plan actuel</h2>
                <p className="text-2xl font-bold text-primary">{sub.subscription_tier || '—'}</p>
                {sub.subscription_end && (
                  <p className="text-sm text-muted-foreground">
                    Renouvellement le {new Date(sub.subscription_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Minutes disponibles</p>
                <p className="text-3xl font-bold text-secondary">{sub.minutes_balance || 0}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  minutes TTS
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Plans */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2">Plans d'abonnement</h2>
            <p className="text-muted-foreground">Accédez à toutes les fonctionnalités premium</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlanKey === plan.key;
              const IconComponent = plan.icon;
              
              return (
                <Card key={plan.id} className={`relative p-6 transition-all duration-300 hover:shadow-lg ${
                  plan.popular ? 'ring-2 ring-primary shadow-primary/20' : ''
                } ${isCurrent ? 'bg-primary/5 border-primary' : 'bg-card hover:bg-card/80'}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                      Populaire
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{plan.id}</h3>
                      {isCurrent && <Badge variant="secondary" className="mt-1">Actuel</Badge>}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    {plan.key === 'enterprise' ? (
                      <div className="text-2xl font-bold text-foreground">Sur devis</div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-foreground">
                          {plan.price.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm text-muted-foreground">/mois</div>
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Utilisateurs: {plan.users}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Modèles IA: {plan.models}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Images DALL·E 3: {plan.images}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Text-to-Voice: {plan.tts}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Minutes TTS: {plan.minutes}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>{plan.limits}</span>
                    </li>
                  </ul>
                  
                  <Button
                    disabled={loading || isCurrent}
                    onClick={() => startCheckout(plan.key)}
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.key === 'enterprise' 
                      ? 'Nous contacter' 
                      : isCurrent 
                        ? 'Plan actuel' 
                        : sub.subscribed 
                          ? 'Mettre à niveau' 
                          : 'Choisir ce plan'
                    }
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Minutes Supplémentaires */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2">Minutes supplémentaires</h2>
            <p className="text-muted-foreground">Achetez des minutes TTS à la demande</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {minutePackages.map((pkg) => (
              <Card key={pkg.id} className={`p-4 transition-all duration-300 hover:shadow-md hover:scale-105 ${
                pkg.popular ? 'ring-2 ring-secondary shadow-secondary/20' : 'hover:bg-card/80'
              }`}>
                {pkg.popular && (
                  <Badge variant="secondary" className="mb-3">
                    Meilleur rapport
                  </Badge>
                )}
                
                <div className="text-center space-y-3">
                  <div className="p-3 mx-auto w-fit rounded-full bg-secondary/10">
                    <Clock className="h-6 w-6 text-secondary" />
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-foreground">{pkg.minutes}</div>
                    <div className="text-xs text-muted-foreground">minutes</div>
                  </div>
                  
                  <div>
                    <div className="text-xl font-semibold text-foreground">
                      {pkg.price.toLocaleString()} FCFA
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pkg.pricePerMinute} FCFA/min
                    </div>
                  </div>
                  
                  <Button
                    disabled={minutesLoading}
                    onClick={() => purchaseMinutes(pkg.id)}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                    size="sm"
                  >
                    Acheter
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section className="flex justify-center gap-4 pt-8">
          <Button variant="outline" onClick={refresh} disabled={loading || minutesLoading}>
            Actualiser le statut
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Billing;
