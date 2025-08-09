import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Settings, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
}

export const Sidebar = () => {
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

  return (
    <aside className="w-80 bg-card border-r border-border p-4 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
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
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Conversations (30 jours)</h3>
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
              className={`p-3 border ${activeId === c.id ? 'border-primary bg-primary/10' : 'bg-secondary/50 border-secondary hover:bg-secondary/70'} cursor-pointer transition-colors`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.title || 'Sans titre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
      </div>
    </aside>
  );
};