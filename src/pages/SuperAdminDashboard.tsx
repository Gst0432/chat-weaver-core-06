import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, Settings, TrendingUp, Plus, Edit, Trash2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: any[];
  is_active: boolean;
}

interface Stats {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalConversations: number;
}

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalRevenue: 0, activeSubscriptions: 0, totalConversations: 0 });
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    price: 0,
    features: "",
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: dashboardData } = await supabase.functions.invoke('super-admin', {
        body: { action: 'getDashboardData' }
      });

      if (dashboardData) {
        setUsers(dashboardData.users || []);
        setPlans(dashboardData.plans || []);
        setStats(dashboardData.stats || { totalUsers: 0, totalRevenue: 0, activeSubscriptions: 0, totalConversations: 0 });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async () => {
    try {
      const planData = {
        ...newPlan,
        features: newPlan.features.split(',').map(f => f.trim()).filter(f => f)
      };

      const { data } = await supabase.functions.invoke('super-admin', {
        body: { action: 'createPlan', data: planData }
      });

      if (data) {
        toast({
          title: "Succès",
          description: "Plan créé avec succès",
        });
        setNewPlan({ name: "", description: "", price: 0, features: "", is_active: true });
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le plan",
        variant: "destructive",
      });
    }
  };

  const updatePlan = async (plan: Plan) => {
    try {
      const { data } = await supabase.functions.invoke('super-admin', {
        body: { action: 'updatePlan', data: plan }
      });

      if (data) {
        toast({
          title: "Succès",
          description: "Plan mis à jour avec succès",
        });
        setEditingPlan(null);
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le plan",
        variant: "destructive",
      });
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { data } = await supabase.functions.invoke('super-admin', {
        body: { action: 'deletePlan', data: { id: planId } }
      });

      if (data) {
        toast({
          title: "Succès",
          description: "Plan supprimé avec succès",
        });
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le plan",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tableau de Bord Super Admin</h1>
        <Badge variant="secondary">Super Administrateur</Badge>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue} FCFA</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnements Actifs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="plans">Plans d'Abonnement</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
              <CardDescription>
                Liste de tous les utilisateurs enregistrés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Date d'Inscription</TableHead>
                    <TableHead>Dernière Connexion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')
                          : 'Jamais connecté'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Plans d'Abonnement</h3>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un Nouveau Plan</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau plan d'abonnement pour vos utilisateurs
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du Plan</Label>
                    <Input
                      id="name"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Prix (FCFA)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({ ...newPlan, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="features">Fonctionnalités (séparées par des virgules)</Label>
                    <Textarea
                      id="features"
                      value={newPlan.features}
                      onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                      placeholder="Accès illimité aux IA, Support prioritaire, Équipes..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={newPlan.is_active}
                      onCheckedChange={(checked) => setNewPlan({ ...newPlan, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Plan actif</Label>
                  </div>
                  <Button onClick={createPlan} className="w-full">
                    Créer le Plan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{plan.price} FCFA</p>
                    {plan.features && Array.isArray(plan.features) && (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <span className="mr-2">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2 pt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingPlan(plan)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Modifier
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifier le Plan</DialogTitle>
                          </DialogHeader>
                          {editingPlan && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Nom du Plan</Label>
                                <Input
                                  id="edit-name"
                                  value={editingPlan.name}
                                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                  id="edit-description"
                                  value={editingPlan.description}
                                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-price">Prix (FCFA)</Label>
                                <Input
                                  id="edit-price"
                                  type="number"
                                  value={editingPlan.price}
                                  onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="edit-is_active"
                                  checked={editingPlan.is_active}
                                  onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_active: checked })}
                                />
                                <Label htmlFor="edit-is_active">Plan actif</Label>
                              </div>
                              <Button onClick={() => updatePlan(editingPlan)} className="w-full">
                                Mettre à Jour
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deletePlan(plan.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}