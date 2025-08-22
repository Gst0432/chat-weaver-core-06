import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, XCircle, Mail, Clock, ArrowRight } from 'lucide-react';

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

interface InvitationData {
  id: string;
  email: string;
  team_name: string;
  inviter_name: string;
  expires_at: string;
  status: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    document.title = 'Accepter l\'invitation - ChAtélix';
    setMeta('description', 'Rejoignez une équipe sur ChAtélix en acceptant cette invitation.');
    
    checkAuth();
    if (token && email) {
      loadInvitation();
    } else {
      setError('Lien d\'invitation invalide - paramètres manquants');
      setLoading(false);
    }
  }, [token, email]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const loadInvitation = async () => {
    if (!token || !email) return;

    try {
      setLoading(true);
      
      // Query the invitation directly from the database
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          id,
          email,
          expires_at,
          status,
          teams (
            name
          )
        `)
        .eq('id', token)
        .eq('email', email)
        .single();

      if (error) {
        throw new Error('Invitation non trouvée');
      }

      if (!data) {
        throw new Error('Cette invitation n\'existe pas ou a été supprimée');
      }

      if (data.status !== 'pending') {
        throw new Error(`Cette invitation a déjà été ${data.status === 'accepted' ? 'acceptée' : 'traitée'}`);
      }

      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Cette invitation a expiré');
      }

      setInvitation({
        id: data.id,
        email: data.email,
        team_name: data.teams?.name || 'Équipe inconnue',
        inviter_name: 'Un membre de l\'équipe',
        expires_at: data.expires_at,
        status: data.status
      });

    } catch (error: any) {
      console.error('Error loading invitation:', error);
      setError(error.message || 'Impossible de charger l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !isAuthenticated) return;

    // Check if user email matches invitation email
    if (userEmail !== invitation.email) {
      toast({
        title: "Erreur",
        description: `Cette invitation est pour ${invitation.email}. Vous êtes connecté avec ${userEmail}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setAccepting(true);

      const response = await supabase.functions.invoke('team-management', {
        body: {
          action: 'accept_invitation',
          invitationId: invitation.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de l\'acceptation');
      }

      toast({
        title: "Invitation acceptée !",
        description: `Vous avez rejoint l'équipe ${invitation.team_name}`,
      });

      // Redirect to team page after a short delay
      setTimeout(() => {
        navigate('/team');
      }, 2000);

    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accepter l'invitation",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Store the current URL to redirect back after auth
    sessionStorage.setItem('redirectAfterAuth', window.location.href);
    navigate('/auth');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement de l'invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="p-4 mx-auto w-fit rounded-full bg-destructive/10 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invitation invalide</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="p-4 mx-auto w-fit rounded-full bg-muted/50 mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invitation non trouvée</h2>
            <p className="text-muted-foreground mb-6">
              Cette invitation n'existe pas ou a été supprimée.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="p-4 mx-auto w-fit rounded-full bg-primary/10 mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Invitation d'équipe</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre une équipe sur ChAtélix
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{invitation.team_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Invitation pour : {invitation.email}
                </p>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                En attente
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Expire le {formatDate(invitation.expires_at)}</p>
            </div>
          </div>

          {/* Authentication Status */}
          {!isAuthenticated ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Vous devez vous connecter pour accepter cette invitation.
                {invitation.email && (
                  <span className="block mt-2 text-sm">
                    Connectez-vous avec l'adresse <strong>{invitation.email}</strong>
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : userEmail !== invitation.email ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Cette invitation est pour <strong>{invitation.email}</strong> mais vous êtes connecté avec <strong>{userEmail}</strong>.
                Veuillez vous connecter avec le bon compte.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Vous êtes connecté avec le bon compte. Vous pouvez accepter cette invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {!isAuthenticated ? (
              <>
                <Button onClick={handleSignIn} className="w-full">
                  Se connecter pour accepter
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Retour à l'accueil
                </Button>
              </>
            ) : userEmail === invitation.email ? (
              <>
                <Button 
                  onClick={handleAcceptInvitation} 
                  disabled={accepting}
                  className="w-full flex items-center gap-2"
                >
                  {accepting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Acceptation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Accepter et rejoindre l'équipe
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button onClick={() => navigate('/team')} variant="outline" className="w-full">
                  Voir mes équipes
                </Button>
              </>
            ) : (
              <Button onClick={handleSignIn} className="w-full">
                Se connecter avec {invitation.email}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}