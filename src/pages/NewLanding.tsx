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
  X
} from "lucide-react";
import { useState } from "react";

const NewLanding = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Brain,
      title: "Modèles IA Avancés",
      description: "Accédez à GPT-4, GPT-5, Deepseek V3 et Gemini dans une interface unifiée"
    },
    {
      icon: MessageSquare,
      title: "Chat Intelligent",
      description: "Conversations naturelles avec support de la voix et génération d'images"
    },
    {
      icon: Zap,
      title: "Performance Optimale",
      description: "Réponses ultra-rapides avec notre infrastructure cloud optimisée"
    },
    {
      icon: Users,
      title: "Travail d'Équipe",
      description: "Collaboration en temps réel avec gestion des droits d'accès"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Martinez",
      role: "CEO, TechCorp",
      content: "Chatelix a révolutionné notre productivité. L'accès à plusieurs modèles IA en un seul endroit est fantastique.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face"
    },
    {
      name: "David Chen",
      role: "Développeur Senior",
      content: "L'interface est intuitive et les performances excellentes. Exactement ce dont nous avions besoin.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
    },
    {
      name: "Marie Dubois",
      role: "Consultante IA",
      content: "La qualité des réponses et la variété des modèles disponibles font de Chatelix un outil indispensable.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face"
    }
  ];

  const plans = [
    {
      id: 'Starter',
      price: 7500,
      users: '1 utilisateur',
      features: [
        'GPT-4 Turbo + GPT-5 + Deepseek V3',
        '10 images DALL·E 3/mois',
        '100 minutes TTS incluses',
        'Support email'
      ],
      popular: false
    },
    {
      id: 'Pro',
      price: 22000,
      users: 'Jusqu\'à 5 utilisateurs',
      features: [
        'Tous les modèles IA premium',
        '50 images DALL·E 3/mois',
        '500 minutes TTS incluses',
        'Support prioritaire',
        'Équipes & collaboration'
      ],
      popular: true
    },
    {
      id: 'Business',
      price: 55000,
      users: 'Jusqu\'à 20 utilisateurs',
      features: [
        'Accès illimité aux modèles',
        'Images illimitées',
        'Minutes TTS illimitées',
        'Support dédié',
        'API complète'
      ],
      popular: false
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
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Chatelix</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Fonctionnalités
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-gradient-primary text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              Plateforme Multi-API de nouvelle génération
            </Badge>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
              L'IA accessible à tous avec 
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Chatelix</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Découvrez la puissance de GPT-4, GPT-5, Deepseek V3 et Gemini réunis dans une seule plateforme intuitive. 
              Créez, collaborez et innovez avec l'IA de demain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-gradient-primary hover:shadow-glow text-lg px-8 py-6"
              >
                <Play className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/app')}
                className="text-lg px-8 py-6"
              >
                Voir la démo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="mt-12 text-sm text-muted-foreground">
              Aucune carte de crédit requise • Essai gratuit de 7 jours
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full"></div>
            <Card className="relative bg-card/50 backdrop-blur-sm border-border shadow-elegant">
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-semibold">GPT-4 & GPT-5</div>
                    <div className="text-xs text-muted-foreground">OpenAI</div>
                  </div>
                  <div>
                    <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-semibold">Deepseek V3</div>
                    <div className="text-xs text-muted-foreground">Ultra rapide</div>
                  </div>
                  <div>
                    <Star className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-semibold">Gemini</div>
                    <div className="text-xs text-muted-foreground">Google</div>
                  </div>
                  <div>
                    <MessageSquare className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-semibold">Interface Unifiée</div>
                    <div className="text-xs text-muted-foreground">Tout en un</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Fonctionnalités puissantes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour maximiser votre productivité avec l'IA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ce que disent nos utilisateurs
            </h2>
            <p className="text-xl text-muted-foreground">
              Rejoignez des milliers d'utilisateurs satisfaits
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-primary mb-4" />
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img 
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tarifs transparents
            </h2>
            <p className="text-xl text-muted-foreground">
              Choisissez le plan qui correspond à vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={plan.id} className={`relative hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 ${plan.popular ? 'border-primary shadow-elegant scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary">
                    Plus populaire
                  </Badge>
                )}
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">{plan.id}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground"> FCFA/mois</span>
                  </div>
                  <p className="text-muted-foreground mb-6">{plan.users}</p>
                  
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => navigate('/auth')}
                    className={`w-full ${plan.popular ? 'bg-gradient-primary hover:shadow-glow' : ''}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Choisir {plan.id}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Besoin d'une solution personnalisée ?
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
              Contacter l'équipe commerciale
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Prêt à transformer votre productivité ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Rejoignez des milliers d'utilisateurs qui font confiance à Chatelix pour leurs projets IA
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:shadow-glow text-lg px-8 py-6"
            >
              Commencer maintenant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/app')}
              className="text-lg px-8 py-6"
            >
              Essayer la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/20 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Chatelix</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                La plateforme multi-API qui révolutionne l'accès à l'intelligence artificielle. 
                Simple, puissant, accessible.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
                <li><a href="/app" className="hover:text-foreground transition-colors">Application</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
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