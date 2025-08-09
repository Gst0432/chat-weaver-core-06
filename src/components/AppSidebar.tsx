import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Settings, Zap, Users, CreditCard, LogOut, Sparkles, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
}

interface AppSidebarProps {
  isLandingMode?: boolean;
  onAuthRequired?: () => void;
}

export function AppSidebar({ isLandingMode = false, onAuthRequired }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, isMobile } = useSidebar();
  const [loading, setLoading] = useState(!isLandingMode);
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const loadConversations = async () => {
    if (isLandingMode) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Check if user is super admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin');
      
      setIsSuperAdmin(roles && roles.length > 0);
      
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
    if (isLandingMode && onAuthRequired) {
      onAuthRequired();
      return;
    }
    setActiveId(id);
    window.dispatchEvent(new CustomEvent('chat:select-conversation', { detail: { id } }));
  };

  const createNewChat = () => {
    if (isLandingMode && onAuthRequired) {
      onAuthRequired();
      return;
    }
    setActiveId(null);
    window.dispatchEvent(new CustomEvent('chat:new-conversation'));
  };

  const handleNavigation = (path: string) => {
    if (isLandingMode && onAuthRequired) {
      onAuthRequired();
      return;
    }
    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar className="border-r border-border">
      {/* Header */}
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center space-x-2">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/lovable-uploads/ff955a65-24d1-4da4-a5d3-7e518af6492b.png" 
              alt="Chatelix Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-foreground">Chatelix</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        {/* New Chat Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={createNewChat} className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Nouveau chat</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversations List */}
        {!isLandingMode && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Chargement...
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Aucune conversation récente
                  </div>
                ) : (
                  items.map((c) => (
                    <Card
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={`p-3 border cursor-pointer transition-colors ${
                        activeId === c.id 
                          ? 'border-primary bg-primary/10' 
                          : 'bg-secondary/50 border-secondary hover:bg-secondary/70'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{c.title || 'Sans titre'}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Navigation Menu */}
        <SidebarGroup className="mt-auto pt-4 border-t border-border">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleNavigation('/team')} className="w-full justify-start text-muted-foreground hover:text-foreground">
                  <Users className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Équipe</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleNavigation('/billing')} className="w-full justify-start text-muted-foreground hover:text-foreground">
                  <CreditCard className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Abonnement & Tokens</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleNavigation('/settings')} className="w-full justify-start text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Paramètres</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => handleNavigation('/super-admin')} className="w-full justify-start text-orange-600 hover:text-orange-700">
                    <Shield className="w-4 h-4" />
                    {!isCollapsed && <span className="ml-2">Super Admin</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {!isLandingMode && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleSignOut} className="w-full justify-start text-muted-foreground hover:text-foreground mt-2">
                    <LogOut className="w-4 h-4" />
                    {!isCollapsed && <span className="ml-2">Se déconnecter</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}