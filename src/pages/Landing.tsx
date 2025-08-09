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
  Sparkles
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: "Chat Multi-API",
      description: "Accédez à GPT-4 Turbo, GPT-5, Deepseek V3, et Gemini dans une seule plateforme"
    },
    {
      icon: Brain,
      title: "IA Avancée",
      description: "Bénéficiez des dernières avancées en intelligence artificielle"
    },
    {
      icon: Zap,
      title: "Ultra Rapide",
      description: "Responses instantanées avec nos serveurs optimisés"
    },
    {
      icon: Users,
      title: "Collaboration d'équipe",
      description: "Travaillez ensemble avec vos collègues sur vos projets IA"
    }
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Développeuse",
      content: "Chatelix a révolutionné ma façon de travailler avec l'IA. Une seule plateforme pour tous mes besoins.",
      rating: 5
    },
    {
      name: "Thomas Martin", 
      role: "Chef de projet",
      content: "L'interface est intuitive et les résultats sont impressionnants. Je recommande vivement !",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Chatelix</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Connexion
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Commencer gratuitement
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            🚀 Nouvelle plateforme IA
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            L'IA au service de
            <br />
            votre créativité
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Accédez aux meilleurs modèles d'IA du marché dans une interface unifiée. 
            GPT-4 Turbo, GPT-5, Deepseek V3, Gemini et bien plus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
              onClick={() => navigate('/auth')}
            >
              Commencer maintenant
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg">
              Voir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pourquoi choisir Chatelix ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Une plateforme complète qui réunit tous les outils IA dont vous avez besoin
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-elegant transition-all duration-300">
                <CardContent className="pt-6">
                  <feature.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tarifs transparents</h2>
            <p className="text-muted-foreground">Commencez gratuitement, évoluez selon vos besoins</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <Card className="relative">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">Starter</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">5€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />1 utilisateur</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Tous les modèles IA</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />50 images/mois</li>
                </ul>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-primary shadow-elegant">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-primary">
                Populaire
              </Badge>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">Pro</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">15€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />5 utilisateurs</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Tous les modèles IA</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />200 images/mois</li>
                </ul>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="relative">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">Business</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">35€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />20 utilisateurs</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Tous les modèles IA</li>
                  <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />500 images/mois</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:shadow-glow"
            >
              Voir tous les tarifs
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ce que disent nos utilisateurs</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à révolutionner votre façon de travailler ?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui font confiance à Chatelix pour leurs projets IA
          </p>
          <Button 
            size="lg"
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            onClick={() => navigate('/auth')}
          >
            Commencer gratuitement
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Chatelix. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;