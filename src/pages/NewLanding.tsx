import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Brain, 
  Zap, 
  Users, 
  Star,
  Check,
  ArrowRight,
  Sparkles,
  Shield,
  Play,
  Quote,
  Menu,
  X,
  Image,
  Mic,
  Volume2,
  Infinity,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Mail,
  Twitter,
  Github
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import professionalAiHero from "@/assets/professional-ai-hero.png";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  is_active: boolean;
  popular?: boolean;
  buttonText?: string;
}

const NewLanding = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Présentation - Pourquoi la plateforme est unique
  const uniquePoints = [
    {
      icon: Infinity,
      title: "IA de dernière génération",
      description: "ChatGPT-5, ChatGPT-4, Deepseek V3, Gemini Pro"
    },
    {
      icon: Image,
      title: "Outils multimédia intégrés",
      description: "Génération d'images, voix, transcription"
    },
    {
      icon: Zap,
      title: "Utilisation illimitée",
      description: "Pas de limites d'utilisation mensuelle"
    },
    {
      icon: Globe,
      title: "Accessible partout",
      description: "Interface web intuitive et responsive"
    }
  ];

  // Fonctionnalités détaillées
  const detailedFeatures = [
    {
      icon: MessageSquare,
      title: "Chat IA illimité",
      description: "Accès illimité à ChatGPT-5, ChatGPT-4, Deepseek V3 et Gemini Pro pour toutes vos conversations.",
      image: "/lovable-uploads/18559761-9d7a-4f88-b792-3c402d548818.png"
    },
    {
      icon: Image,
      title: "Génération d'images",
      description: "Créez des images haute résolution avec OpenAI DALL-E 3 et Runware. Qualité professionnelle garantie.",
      image: "/lovable-uploads/4d23475f-fa47-4f1b-bba0-5b597d4be24b.png"
    },
    {
      icon: Volume2,
      title: "Voix Off (Text → Speech)",
      description: "Conversion texte vers voix avec OpenAI et Google TTS. Plusieurs voix et langues disponibles.",
      image: "/lovable-uploads/eb4adb27-683e-42a7-ade3-aa8185079db6.png"
    },
    {
      icon: Mic,
      title: "Transcription audio (Speech → Text)",
      description: "Reconnaissance vocale avancée pour vos interviews, podcasts et vidéos. Précision maximale.",
      image: "/lovable-uploads/ff955a65-24d1-4da4-a5d3-7e518af6492b.png"
    }
  ];

  // Fonctionnalités bonus
  const bonusFeatures = [
    { icon: Shield, title: "API intégrée", description: "Accès complet via API" },
    { icon: Lock, title: "Espace de stockage sécurisé", description: "Vos données protégées" },
    { icon: Star, title: "Interface intuitive", description: "Design ergonomique" }
  ];

  // Plans d'abonnement fixes
  const plans = [
    {
      id: '1',
      name: 'Starter',
      description: 'Parfait pour débuter avec l\'IA',
      price: 7500,
      features: [
        'Utilisateurs: 1',
        'Modèles IA: GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini illimité',
        'Images DALL·E 3: 10 images / mois',
        'Text-to-Voice: OpenAI Standard TTS uniquement',
        'Minutes TTS: 100 min inclus',
        '+50 FCFA/min TTS au-delà, +500 FCFA/image'
      ],
      is_active: true,
      popular: false,
      buttonText: 'Mettre à niveau'
    },
    {
      id: '2', 
      name: 'Pro',
      description: 'Le plus populaire - Idéal pour les professionnels',
      price: 22000,
      features: [
        'Utilisateurs: Jusqu\'à 5',
        'Modèles IA: GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini illimité',
        'Images DALL·E 3: 50 images / mois',
        'Text-to-Voice: OpenAI HD TTS + Google WaveNet',
        'Minutes TTS: 500 min inclus',
        'Forfait illimité au-delà, images illimitées'
      ],
      is_active: true,
      popular: true,
      buttonText: 'Plan actuel'
    },
    {
      id: '3',
      name: 'Business', 
      description: 'Pour les équipes et entreprises',
      price: 55000,
      features: [
        'Utilisateurs: Jusqu\'à 20',
        'Modèles IA: GPT-4 Turbo + GPT-5 + Deepseek V3 + Gemini illimité',
        'Images DALL·E 3: Illimité',
        'Text-to-Voice: OpenAI HD + Google WaveNet + voix premium',
        'Minutes TTS: Illimité',
        'Support prioritaire, gestion équipes'
      ],
      is_active: true,
      popular: false,
      buttonText: 'Choisir Business'
    }
  ];

  // Témoignages
  const testimonials = [
    {
      name: "Sarah Martinez",
      role: "CEO, TechCorp",
      content: "Chatelix a révolutionné notre productivité. L'accès illimité à toutes les IA en un endroit, c'est fantastique !",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "David Chen",
      role: "Développeur Senior",
      content: "Fini les abonnements multiples ! Une seule plateforme pour tout. L'interface est parfaite.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Marie Dubois",
      role: "Consultante IA",
      content: "La qualité des réponses et la variété des outils font de Chatelix un indispensable.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Pierre Durand",
      role: "Créateur de contenu",
      content: "Génération d'images, transcription, voix... tout y est ! Ma productivité a explosé.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Sophie Laurent",
      role: "Marketing Manager",
      content: "L'utilisation illimitée change tout. Plus de stress avec les quotas, on peut enfin créer librement.",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
      rating: 5
    }
  ];

  // FAQ
  const faqs = [
    {
      question: "Est-ce vraiment illimité ?",
      answer: "Oui ! Contrairement aux autres plateformes, Chatelix vous donne un accès totalement illimité à tous les modèles IA, génération d'images, voix off et transcription. Aucune limite mensuelle."
    },
    {
      question: "Quels outils sont inclus ?",
      answer: "Chatelix inclut ChatGPT-5, ChatGPT-4, Deepseek V3, Gemini Pro, DALL-E 3, Runware pour les images, OpenAI et Google TTS pour la voix, plus la transcription audio avancée."
    },
    {
      question: "Puis-je annuler à tout moment ?",
      answer: "Absolument ! Vous pouvez annuler votre abonnement à tout moment depuis votre tableau de bord. Aucun engagement, aucune question posée."
    },
    {
      question: "Comment se passe le paiement ?",
      answer: "Paiements sécurisés par Moneroo. Nous acceptons toutes les cartes bancaires et les paiements mobiles. Facturation automatique selon votre plan choisi."
    },
    {
      question: "Y a-t-il une garantie ?",
      answer: "Oui ! Nous offrons une garantie satisfait ou remboursé de 30 jours. Si vous n'êtes pas satisfait, nous vous remboursons intégralement."
    },
    {
      question: "L'API est-elle incluse ?",
      answer: "Oui, l'accès API est inclus dans tous nos plans. Intégrez facilement Chatelix dans vos applications et workflows existants."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                <img 
                  src="/lovable-uploads/bb8847f5-56f9-4e8b-b9f0-67b8a41e9639.png"
                  alt="Chatelix Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-foreground">Chatelix</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Fonctionnalités
              </a>
              <a href="#video" className="text-muted-foreground hover:text-foreground transition-colors">
                Démo
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Témoignages
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Tarifs
              </a>
              <Button onClick={() => navigate('/auth')} className="bg-gradient-primary hover:shadow-glow">
                Commencer
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border bg-background">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Fonctionnalités
                </a>
                <a href="#video" className="text-muted-foreground hover:text-foreground transition-colors">
                  Démo
                </a>
                <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                  Témoignages
                </a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Tarifs
                </a>
                <Button onClick={() => navigate('/auth')} className="bg-gradient-primary hover:shadow-glow w-fit">
                  Commencer
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-8 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            Toute la puissance de l'IA… 
            <span className="bg-gradient-primary bg-clip-text text-transparent">en illimité !</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
            ChatGPT-5, ChatGPT-4, Deepseek V3, Gemini Pro, génération d'images, voix off, transcription… 
            <span className="font-semibold">Tout en un, sans limites.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:shadow-glow text-xl px-12 py-8"
            >
              Essayer maintenant
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xl px-12 py-8"
            >
              Voir les fonctionnalités
            </Button>
          </div>

          {/* Hero Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-3xl"></div>
            <img 
              src={professionalAiHero}
              alt="Interface Chatelix - Toutes les IA en un seul endroit"
              className="relative w-full max-w-4xl mx-auto h-auto object-contain drop-shadow-2xl rounded-2xl"
            />
          </div>
        </div>
      </section>

      {/* 2. Section Présentation */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-8">
            Pourquoi Chatelix est unique ?
          </h2>
          <p className="text-xl text-muted-foreground mb-16 max-w-4xl mx-auto leading-relaxed">
            Fini les abonnements multiples et les limites d'utilisation. Accédez à toutes les IA de pointe 
            et aux outils créatifs en illimité, sur une seule plateforme.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {uniquePoints.map((point, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <point.icon className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-xl mb-4">{point.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{point.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Fonctionnalités Détaillées */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              Fonctionnalités Complètes
            </h2>
          </div>

          <div className="space-y-32">
            {detailedFeatures.map((feature, index) => (
              <div key={index} className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                {/* Contenu */}
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-3xl font-bold mb-6">{feature.title}</h3>
                  <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                    {feature.description}
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/auth')}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    Tester maintenant
                  </Button>
                </div>
                
                {/* Image */}
                <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-2xl rounded-2xl"></div>
                    <img 
                      src={feature.image}
                      alt={feature.title}
                      className="relative w-full h-auto object-contain rounded-2xl shadow-elegant"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fonctionnalités Bonus */}
          <div className="mt-32">
            <h3 className="text-3xl font-bold text-center mb-16">Et bien plus encore...</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bonusFeatures.map((bonus, index) => (
                <Card key={index} className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <bonus.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{bonus.title}</h4>
                    <p className="text-muted-foreground text-sm">{bonus.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section Vidéo Démonstration */}
      <section id="video" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/20">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-8">
            Voir Chatelix en Action
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Découvrez comment utiliser chaque IA et outil dans cette démonstration complète
          </p>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-30 blur-3xl rounded-3xl"></div>
            <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-elegant">
              <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center mb-6">
                <div className="text-center">
                  <Play className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">Vidéo de démonstration</p>
                  <p className="text-sm text-muted-foreground">Disponible prochainement</p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => navigate('/app')}
                className="bg-gradient-primary hover:shadow-glow"
              >
                <Play className="w-5 h-5 mr-2" />
                Essayer maintenant gratuitement
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Tarifs & Plans */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              Tarifs & Plans
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Des plans transparents pour tous les besoins. Choisissez celui qui vous convient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={plan.id} className={`relative hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 ${plan.popular ? 'border-primary shadow-elegant scale-105 bg-gradient-to-b from-primary/5 to-background' : 'bg-card/50 backdrop-blur-sm'}`}>
                {plan.popular && (
                    <Badge className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-lg px-6 py-2">
                      Populaire
                    </Badge>
                  )}
                  <CardContent className="p-8 text-center">
                    <h3 className="text-3xl font-bold mb-4">{plan.name}</h3>
                    <p className="text-muted-foreground mb-6">{plan.description}</p>
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center">
                        <span className="text-5xl font-bold">{plan.price.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-2"> FCFA/mois</span>
                      </div>
                      {plan.popular && (
                        <div className="mt-2">
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            Actuel
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <ul className="space-y-4 mb-8 text-left">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      size="lg"
                      onClick={() => navigate('/auth')}
                      className={`w-full ${plan.popular ? 'bg-gradient-primary hover:shadow-glow text-lg py-6' : 'text-lg py-6'}`}
                      variant={plan.popular ? "default" : "outline"}
                      disabled={plan.popular}
                    >
                      {plan.buttonText || `Choisir ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>

          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-6 text-lg">
              Garantie satisfait ou remboursé 30 jours • Support client dédié
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
              Commencer maintenant
            </Button>
          </div>
        </div>
      </section>

      {/* 6. Témoignages / Avis utilisateurs */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              Témoignages
            </h2>
            <p className="text-xl text-muted-foreground">
              Découvrez pourquoi nos utilisateurs adorent Chatelix
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  
                  <Quote className="w-8 h-8 text-primary mb-4" />
                  <p className="text-muted-foreground mb-6 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <img 
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              Questions Fréquentes
            </h2>
            <p className="text-xl text-muted-foreground">
              Toutes les réponses à vos questions sur Chatelix
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-0">
                  <button
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-secondary/50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <h3 className="font-semibold text-lg pr-4">{faq.question}</h3>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Section CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-8 text-primary-foreground">
            Prêt à révolutionner votre productivité ?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            ✅ Accès illimité à toutes les IA<br />
            ✅ Génération d'images illimitée<br />
            ✅ Voix off et transcription incluses<br />
            ✅ Interface intuitive et moderne
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-background text-foreground hover:bg-background/90 text-xl px-12 py-8 shadow-xl"
            >
              Inscrivez-vous maintenant
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/app')}
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-xl px-12 py-8"
            >
              Essayer gratuitement
            </Button>
          </div>

          <p className="text-primary-foreground/80 text-sm mt-8">
            Sans engagement • Annulation à tout moment • Support français
          </p>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-secondary/20 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/bb8847f5-56f9-4e8b-b9f0-67b8a41e9639.png"
                    alt="Chatelix Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-bold">Chatelix</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md mb-6">
                La plateforme multi-API qui révolutionne l'accès à l'intelligence artificielle. 
                Toutes les IA en un seul endroit, sans limites.
              </p>
              <div className="flex gap-4">
                <Button size="sm" variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact
                </Button>
                <Button size="sm" variant="outline">
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
                <li><a href="/app" className="hover:text-foreground transition-colors">Application</a></li>
                <li><a href="#video" className="hover:text-foreground transition-colors">Démo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Mentions légales</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Centre d'aide</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Chatelix. Conçu avec ❤️ par{" "}
              <a 
                href="https://gstartup.pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                G-STARTUP
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewLanding;