import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Settings, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
}

interface SidebarProps {
  selectedConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
}

export const Sidebar = ({ selectedConversationId, onSelectConversation = () => {} }: SidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id,title,created_at")
      .order("created_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewConversation = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const title = "Nouvelle conversation";
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title })
      .select("id")
      .maybeSingle();

    if (!error && data?.id) {
      onSelectConversation(data.id);
      fetchConversations();
    }
  };

  return (
    <aside className="w-80 bg-background p-4 flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Chatelix</h1>
        </div>
        <Button onClick={handleNewConversation} className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Chats</h3>
        <div className="space-y-2">
          {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
          {!loading && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune conversation.</p>
          )}
          {conversations.map((c) => (
            <Card
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`p-3 bg-transparent border-border hover:bg-muted/60 cursor-pointer transition-colors ${
                c.id === selectedConversationId ? "bg-muted border-l-2 border-primary" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.title || "Sans titre"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
      </div>
    </aside>
  );
};
