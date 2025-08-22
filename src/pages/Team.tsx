import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Crown, UserPlus, Trash2, Mail, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    display_name?: string;
    avatar_url?: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  created_at: string;
  isOwner: boolean;
  userRole?: string;
  team_members: TeamMember[];
}

interface TeamData {
  teams: Team[];
  teamLimit: number;
  subscription: string;
}

const Team = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamLimit, setTeamLimit] = useState(1);
  const [subscription, setSubscription] = useState("Gratuit");
  
  // Create team state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  
  // Invite member state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    document.title = "Équipe | Chatelix";
    setMeta("description", "Gérez votre équipe et collaborez avec vos collègues sur Chatelix.");
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('team-management', {
        body: { action: 'get_teams' }
      });

      if (error) throw error;

      const teamData = data as TeamData;
      setTeams(teamData.teams || []);
      setTeamLimit(teamData.teamLimit);
      setSubscription(teamData.subscription);
    } catch (error: any) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible de charger les équipes',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('team-management', {
        body: { action: 'create_team', teamName: newTeamName.trim() }
      });

      if (error) throw error;

      toast({ title: 'Succès', description: 'Équipe créée avec succès' });
      setShowCreateDialog(false);
      setNewTeamName("");
      loadTeams();
    } catch (error: any) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible de créer l\'équipe',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeamId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('team-management', {
        body: { 
          action: 'invite_member', 
          teamId: selectedTeamId,
          memberEmail: inviteEmail.trim()
        }
      });

      if (error) throw error;

      toast({ title: 'Succès', description: 'Membre invité avec succès' });
      setShowInviteDialog(false);
      setInviteEmail("");
      setSelectedTeamId("");
      loadTeams();
    } catch (error: any) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible d\'inviter le membre',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('team-management', {
        body: { 
          action: 'remove_member', 
          teamId,
          memberId
        }
      });

      if (error) throw error;

      toast({ title: 'Succès', description: 'Membre supprimé' });
      loadTeams();
    } catch (error: any) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible de supprimer le membre',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
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
                  </DialogHeader>
                  <form onSubmit={handleCreateTeam} className="space-y-4">
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
                      <Button type="submit" disabled={loading}>
                        Créer l'équipe
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
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
                        Créée le {new Date(team.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {team.isOwner && (
                    <div className="flex gap-2">
                      <Dialog open={showInviteDialog && selectedTeamId === team.id} onOpenChange={(open) => {
                        setShowInviteDialog(open);
                        if (open) setSelectedTeamId(team.id);
                        else setSelectedTeamId("");
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={team.team_members.length >= teamLimit}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Inviter
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Inviter un membre dans {team.name}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleInviteMember} className="space-y-4">
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
                                  setSelectedTeamId("");
                                }}
                              >
                                Annuler
                              </Button>
                              <Button type="submit" disabled={loading}>
                                Envoyer l'invitation
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>

                {/* Team Members */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Membres ({team.team_members.length}/{teamLimit === 999 ? '∞' : teamLimit})
                  </h4>
                  
                  {team.team_members.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">
                      Aucun membre dans cette équipe.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {team.team_members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
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
                                    onClick={() => handleRemoveMember(team.id, member.id)}
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
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={loadTeams} disabled={loading}>
            Actualiser
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Team;