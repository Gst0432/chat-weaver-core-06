import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, Download, Palette, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  title?: string;
  description?: string;
  onClose?: () => void;
}

export const UpgradePrompt = ({ 
  title = "Quota épuisé", 
  description = "Vous avez utilisé toutes vos générations gratuites.",
  onClose 
}: UpgradePromptProps) => {
  const navigate = useNavigate();

  const features = [
    { icon: Zap, text: "Générations illimitées" },
    { icon: Download, text: "Téléchargement des créations" },
    { icon: Palette, text: "Images haute qualité" },
    { icon: Mic, text: "Voix premium" },
  ];

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-2">
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-center">Débloquez toutes les fonctionnalités:</h4>
          <div className="grid grid-cols-2 gap-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-background/60 rounded-md">
                <feature.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={() => navigate('/billing')} 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            size="lg"
          >
            <Crown className="h-4 w-4 mr-2" />
            Choisir un plan
          </Button>
          
          {onClose && (
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full text-muted-foreground"
              size="sm"
            >
              Continuer en mode test
            </Button>
          )}
        </div>

        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            Sans engagement • Annulation facile
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};