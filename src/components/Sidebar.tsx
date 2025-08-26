import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Settings, Zap, Users, CreditCard, LogOut, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
}

export const Sidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .gte('created_at', thirtyDaysAgo)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as ConversationRow[]);
      if ((data || []).length && !activeId) setActiveId((data as any)[0].id as string);
    } catch (e) {
      console.error('Load conversations failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const onReload = () => loadConversations();
    window.addEventListener('chat:reload-conversations', onReload);
    return () => window.removeEventListener('chat:reload-conversations', onReload);
  }, []);

  const selectConversation = (id: string) => {
    setActiveId(id);
    window.dispatchEvent(new CustomEvent('chat:select-conversation', { detail: { id } }));
  };

  const createConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('conversations')
        .insert({ title: 'Nouvelle conversation', user_id: user.id })
        .select('id, title, created_at')
        .maybeSingle();
      if (error) throw error;
      const row = data as ConversationRow;
      setItems(prev => [row, ...prev]);
      selectConversation(row.id);
    } catch (e) {
      console.error('Create conversation failed', e);
    }
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection de la conversation
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Delete the specific conversation and its messages
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setItems(prev => prev.filter(item => item.id !== conversationId));
      
      // If this was the active conversation, clear it
      if (activeId === conversationId) {
        setActiveId(null);
        window.dispatchEvent(new CustomEvent('chat:new-conversation'));
      }
      
      window.dispatchEvent(new CustomEvent('chat:reload-conversations'));
      
      toast({
        title: "Conversation supprimée",
        description: "La conversation a été supprimée avec succès.",
      });
    } catch (error) {
      console.error('Erreur suppression conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la conversation.",
        variant: "destructive",
      });
    }
  };

  const deleteAllConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Delete all conversations and their messages
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setItems([]);
      setActiveId(null);
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('chat:new-conversation'));
      window.dispatchEvent(new CustomEvent('chat:reload-conversations'));
      
      toast({
        title: "Historique supprimé",
        description: "Toutes vos conversations ont été supprimées avec succès.",
      });
    } catch (error) {
      console.error('Erreur suppression historique:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'historique des conversations.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  return (
    <aside className="w-80 bg-card border-r border-border p-4 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/lovable-uploads/bb8847f5-56f9-4e8b-b9f0-67b8a41e9639.png"
              alt="Chatelix Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Chatelix</h1>
        </div>
        <Button onClick={createConversation} variant="default" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Conversations (30 jours)</h3>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteAllConversations}
              className="h-6 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {loading && (
            <Card className="p-3 bg-secondary/50 border-secondary">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </Card>
          )}
          {!loading && items.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune conversation récente.</p>
          )}
          {items.map((c) => (
            <Card
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`group p-3 border ${activeId === c.id ? 'border-primary bg-primary/10' : 'bg-secondary/50 border-secondary hover:bg-secondary/70'} cursor-pointer transition-colors`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.title || 'Sans titre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="ghost" onClick={() => navigate('/team')} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Users className="w-4 h-4 mr-2" />
          Équipe
        </Button>
        <Button variant="ghost" onClick={() => navigate('/billing')} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <CreditCard className="w-4 h-4 mr-2" />
          Abonnement & Tokens
        </Button>
        <Button variant="ghost" onClick={() => navigate('/settings')} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
        <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-muted-foreground hover:text-foreground mt-2">
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  );
};