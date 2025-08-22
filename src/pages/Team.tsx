import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Settings, History, Mail, Clock, CheckCircle, XCircle, Crown, User, Calendar, Trash2, Ban, RefreshCw, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

interface TeamMember {
  id: string;
  role: string;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

interface TeamHistoryItem {
  id: string;
  action: string;
  created_at: string;
  details: any;
}

interface Team {
  id: string;
  name: string;
  created_at: string;
  isOwner: boolean;
  userRole?: string;
  team_members: TeamMember[];
  pendingInvitations: PendingInvitation[];
}

interface TeamData {
  teams: Team[];
  teamLimit: number;
  subscription: string;
}

export default function Team() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamLimit, setTeamLimit] = useState(1);
  const [subscription, setSubscription] = useState('Gratuit');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamHistory, setTeamHistory] = useState<TeamHistoryItem[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Gestion d\'équipe - ChAtélix';
    setMeta('description', 'Gérez vos équipes, invitez des membres et collaborez efficacement sur ChAtélix.');
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('team-management', {
        body: { action: 'get_teams' }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du chargement des équipes');
      }

      const data: TeamData = response.data;
      setTeams(data.teams || []);
      setTeamLimit(data.teamLimit || 1);
      setSubscription(data.subscription || 'Gratuit');
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les équipes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'équipe est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const response = await supabase.functions.invoke('team-management', {
        body: {
          action: 'create_team',
          teamName: newTeamName.trim()
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la création');
      }

      toast({
        title: "Succès",
        description: "Équipe créée avec succès",
      });

      setNewTeamName('');
      setShowCreateDialog(false);
      await loadTeams();
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'équipe",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam || !inviteEmail.trim()) {
      toast({
        title: "Erreur",
        description: "Email requis pour l'invitation",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast({
        title: "Erreur",
        description: "Format d'email invalide",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsInviting(true);
      const response = await supabase.functions.invoke('team-management', {
        body: {
          action: 'invite_member',
          teamId: selectedTeam.id,
          memberEmail: inviteEmail.trim()
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de l\'invitation');
      }

      toast({
        title: "Invitation envoyée",
        description: `Une invitation a été envoyée à ${inviteEmail}`,
      });

      setInviteEmail('');
      setShowInviteDialog(false);
      await loadTeams();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;

    try {
      const response = await supabase.functions.invoke('team-management', {
        body: {
          action: 'remove_member',
          teamId: selectedTeam.id,
          memberId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la suppression');
      }

      toast({
        title: "Membre supprimé",
        description: "Le membre a été retiré de l'équipe",
      });

      await loadTeams();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le membre",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await supabase.functions.invoke('team-management', {
        body: {
          action: 'cancel_invitation',
          invitationId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de l\'annulation');
      }

      toast({
        title: "Invitation annulée",
        description: "L'invitation a été annulée",
      });

      await loadTeams();
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler l'invitation",
        variant: "destructive",
      });
    }
  };

  const loadTeamHistory = async (teamId: string) => {
    try {
      setLoadingHistory(true);
      const response = await supabase.functions.invoke('team-management', {
        body: {
          action: 'get_team_history',
          teamId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du chargement de l\'historique');
      }

      setTeamHistory(response.data.history || []);
    } catch (error: any) {
      console.error('Error loading team history:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger l'historique",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryDialog = async (team: Team) => {
    setSelectedTeam(team);
    setShowHistoryDialog(true);
    await loadTeamHistory(team.id);
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

  const formatHistoryAction = (action: string, details: any) => {
    switch (action) {
      case 'create_team':
        return `Équipe "${details.team_name}" créée`;
      case 'invite_member':
        return `Invitation envoyée à ${details.invited_email}`;
      case 'accept_invitation':
        return `Invitation acceptée`;
      case 'remove_member':
        return `Membre ${details.removed_user_name || 'inconnu'} retiré`;
      case 'cancel_invitation':
        return `Invitation annulée pour ${details.cancelled_email}`;
      default:
        return action;
    }
  };

  const ownedTeamsCount = teams.filter(t => t.isOwner).length;
  const maxTeams = subscription.toLowerCase().includes('pro') ? 5 :
                  subscription.toLowerCase().includes('business') ? 20 :
                  subscription.toLowerCase().includes('enterprise') ? 999 : 1;
  const canCreateTeam = teamLimit > 1 && ownedTeamsCount < maxTeams;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
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
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Gestion d'équipe
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Plan {subscription} - {ownedTeamsCount}/{maxTeams === 999 ? '∞' : maxTeams} équipes • {teamLimit === 999 ? 'Illimité' : `${teamLimit} membres max`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadTeams}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {canCreateTeam && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Créer une équipe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer une nouvelle équipe</DialogTitle>
                      <DialogDescription>
                        Créez une équipe pour collaborer avec vos collègues
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="teamName">Nom de l'équipe</Label>
                        <Input
                          id="teamName"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="Ex: Équipe Marketing"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowCreateDialog(false)}
                        >
                          Annuler
                        </Button>
                        <Button 
                          onClick={handleCreateTeam} 
                          disabled={isCreating || !newTeamName.trim()}
                        >
                          {isCreating ? 'Création...' : 'Créer l\'équipe'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-6 py-8">
        {/* Upgrade notice for starter plan */}
        {teamLimit <= 1 && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/10">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Débloquez la collaboration d'équipe
                </h2>
                <p className="text-muted-foreground">
                  Passez au plan Pro ou supérieur pour créer des équipes et inviter des collaborateurs.
                </p>
              </div>
              <Button onClick={() => navigate("/billing")} variant="default">
                Mettre à niveau
              </Button>
            </div>
          </Card>
        )}

        {/* Teams List */}
        <div className="space-y-6">
          {teams.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="p-4 mx-auto w-fit rounded-full bg-muted/50 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucune équipe</h3>
              <p className="text-muted-foreground mb-4">
                {teamLimit <= 1 
                  ? "Votre plan ne permet pas de créer des équipes."
                  : `Vous pouvez créer jusqu'à ${maxTeams === 999 ? 'un nombre illimité' : maxTeams} équipe${maxTeams > 1 ? 's' : ''} avec votre plan ${subscription}.`
                }
              </p>
              {canCreateTeam && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  Créer ma première équipe
                </Button>
              )}
            </Card>
          ) : (
            teams.map((team) => (
              <Card key={team.id} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        {team.name}
                        {team.isOwner && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Propriétaire
                          </Badge>
                        )}
                        {!team.isOwner && (
                          <Badge variant="outline">
                            {team.userRole === 'member' ? 'Membre' : team.userRole}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Créée le {formatDate(team.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openHistoryDialog(team)}
                      className="flex items-center gap-1"
                    >
                      <History className="h-4 w-4" />
                      Historique
                    </Button>
                    
                    {team.isOwner && (
                      <Dialog open={showInviteDialog && selectedTeam?.id === team.id} onOpenChange={(open) => {
                        setShowInviteDialog(open);
                        if (open) setSelectedTeam(team);
                        else setSelectedTeam(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={team.team_members.length + team.pendingInvitations.length >= teamLimit}
                            className="flex items-center gap-1"
                          >
                            <Mail className="h-4 w-4" />
                            Inviter
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Inviter un membre dans {team.name}</DialogTitle>
                            <DialogDescription>
                              Envoyez une invitation par email. Si la personne n'a pas de compte, elle pourra en créer un.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="inviteEmail">Adresse email</Label>
                              <Input
                                id="inviteEmail"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="utilisateur@exemple.com"
                                required
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setShowInviteDialog(false);
                                  setSelectedTeam(null);
                                  setInviteEmail('');
                                }}
                              >
                                Annuler
                              </Button>
                              <Button 
                                onClick={handleInviteMember} 
                                disabled={isInviting || !inviteEmail.trim()}
                              >
                                {isInviting ? 'Envoi...' : 'Envoyer l\'invitation'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="members" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="members" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Membres ({team.team_members.length})
                    </TabsTrigger>
                    <TabsTrigger value="invitations" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Invitations ({team.pendingInvitations.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="members" className="space-y-3 mt-4">
                    {team.team_members.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        Aucun membre dans cette équipe.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {team.team_members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {member.profiles?.display_name || `Utilisateur ${member.user_id.slice(-4)}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.role === 'owner' ? 'Propriétaire' : 'Membre'}
                                </p>
                              </div>
                            </div>
                            
                            {team.isOwner && member.role !== 'owner' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer le membre</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer ce membre de l'équipe ?
                                      Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => {
                                        setSelectedTeam(team);
                                        handleRemoveMember(member.id);
                                      }}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="invitations" className="space-y-3 mt-4">
                    {team.pendingInvitations.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        Aucune invitation en attente.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {team.pendingInvitations.map((invitation) => (
                          <div key={invitation.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                <Mail className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{invitation.email}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Expire le {formatDate(invitation.expires_at)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                En attente
                              </Badge>
                              {team.isOwner && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Annuler l'invitation</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir annuler cette invitation ?
                                        L'utilisateur ne pourra plus rejoindre l'équipe avec ce lien.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Non, garder</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleCancelInvitation(invitation.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Oui, annuler
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            ))
          )}
        </div>

        {/* Team History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique de {selectedTeam?.name}
              </DialogTitle>
              <DialogDescription>
                Suivez toutes les activités et modifications de cette équipe
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] w-full">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Aucun historique disponible</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamHistory.map((item, index) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                        {index < teamHistory.length - 1 && (
                          <div className="w-px h-6 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">
                          {formatHistoryAction(item.action, item.details)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}