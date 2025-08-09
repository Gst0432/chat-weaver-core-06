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
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-muted-foreground">Chargement...</span>
                    </div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">Aucune conversation récente</p>
                    <p className="text-xs text-muted-foreground/70">Commencez une nouvelle discussion</p>
                  </div>
                ) : (
                  <>
                    {/* Header de l'historique */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Récent
                      </span>
                      <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    
                    {/* Liste des conversations */}
                    <div className="space-y-1">
                      {items.map((c, index) => (
                        <div
                          key={c.id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <Card
                            onClick={() => selectConversation(c.id)}
                            className={`group relative p-3 border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm ${
                              activeId === c.id 
                                ? 'border-primary bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm' 
                                : 'bg-card/50 border-border/50 hover:bg-card/80 hover:border-border'
                            }`}
                          >
                            {/* Indicateur de conversation active */}
                            {activeId === c.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"></div>
                            )}
                            
                            <div className="flex items-start gap-3 pl-1">
                              {/* Icône avec animation */}
                              <div className={`relative flex-shrink-0 mt-0.5 transition-all duration-200 ${
                                activeId === c.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                              }`}>
                                <MessageSquare className="w-4 h-4" />
                                {activeId === c.id && (
                                  <div className="absolute -inset-1 bg-primary/20 rounded-full animate-pulse"></div>
                                )}
                              </div>
                              
                              {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                  {/* Titre avec meilleur contraste */}
                                  <p className={`text-sm font-medium truncate transition-colors duration-200 ${
                                    activeId === c.id 
                                      ? 'text-primary' 
                                      : 'text-foreground group-hover:text-foreground'
                                  }`}>
                                    {c.title || 'Sans titre'}
                                  </p>
                                  
                                  {/* Date améliorée avec badge */}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-200 ${
                                      activeId === c.id
                                        ? 'bg-primary/10 text-primary/80'
                                        : 'bg-secondary/50 text-muted-foreground group-hover:bg-secondary/70'
                                    }`}>
                                      {formatDistanceToNow(new Date(c.created_at), { 
                                        addSuffix: true, 
                                        locale: fr 
                                      })}
                                    </span>
                                    
                                    {/* Indicateur "nouveau" pour les conversations récentes */}
                                    {new Date(c.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                        Nouveau
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Effet de survol subtil */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                          </Card>
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