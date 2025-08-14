import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Settings, Zap, Users, CreditCard, LogOut, Sparkles, Shield, Wand2 } from "lucide-react";
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
    <Sidebar className="border-r border-border bg-background">
      {/* Header */}
      <SidebarHeader className="border-b border-border p-4 bg-background">
        <div className="flex items-center space-x-2">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/lovable-uploads/bb8847f5-56f9-4e8b-b9f0-67b8a41e9639.png"
              alt="Chatelix Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-foreground">Chatelix</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 bg-background">
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

        {/* SaaS Generator Button */}
        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    console.log('🎯 SaaS Generator button clicked!');
                    window.dispatchEvent(new CustomEvent('chat:toggle-saas-generator'));
                  }} 
                  className="w-full justify-start bg-gradient-primary text-primary-foreground hover:shadow-glow"
                >
                  <Wand2 className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Générateur SaaS</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversations List */}
        {!isLandingMode && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <div className="space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">Aucune conversation récente</p>
                  </div>
                ) : (
                  <>
                    <div className="px-2 pb-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Récent ({items.length})
                      </span>
                    </div>
                    
                    <div className="space-y-0">
                      {items.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => selectConversation(c.id)}
                          className={`group cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-150 ${
                            activeId === c.id 
                              ? 'bg-primary/10 text-primary border border-primary/20' 
                              : 'hover:bg-secondary/50 text-foreground border border-transparent'
                          }`}
                        >
                          {!isCollapsed && (
                            <p className={`text-sm truncate transition-colors ${
                              activeId === c.id 
                                ? 'font-medium text-primary' 
                                : 'text-foreground group-hover:text-primary'
                            }`}>
                              {c.title || 'Sans titre'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Navigation Menu */}
        <SidebarGroup className="mt-auto pt-4 border-t border-border bg-background">
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