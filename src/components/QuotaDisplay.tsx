import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Crown, Zap, AlertTriangle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuota } from '@/hooks/useQuota';

export const QuotaDisplay = () => {
  const { quota, loading, isTestMode } = useQuota();
  const navigate = useNavigate();

  if (loading || !quota) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quota.is_subscribed) {
    return (
      <Card className="mb-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Plan Premium</span>
              <Badge variant="secondary" className="ml-2">
                <Zap className="h-3 w-3 mr-1" />
                Générations illimitées
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
              Gérer l'abonnement
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (quota.free_used / quota.free_limit) * 100;

  return (
    <Card className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Mode Test Gratuit</span>
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                {quota.remaining_free} générations restantes
              </Badge>
            </div>
            {quota.remaining_free === 0 && (
              <Button size="sm" onClick={() => navigate('/billing')} className="bg-primary">
                <Crown className="h-3 w-3 mr-1" />
                Passer au Premium
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Générations utilisées: {quota.free_used}/{quota.free_limit}</span>
              <span>{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {quota.remaining_free > 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-100 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong>Mode test:</strong> Génération limitée sans téléchargement possible. 
                Passez au plan Premium pour des générations illimitées et télécharger vos créations.
              </div>
            </div>
          )}

          {quota.remaining_free === 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <strong>Quota épuisé!</strong> Vous avez utilisé toutes vos générations gratuites. 
                Choisissez un plan pour continuer à générer du contenu.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};