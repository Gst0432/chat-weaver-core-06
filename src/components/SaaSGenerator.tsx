import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebPreview } from "@/components/WebPreview";
import { CodeEditor } from "@/components/CodeEditor";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageSkeleton, CodeSkeleton, PreviewSkeleton } from "./ui/loading-skeleton";
import { 
  Settings,
  Globe, 
  Code, 
  Send,
  Loader2,
  Database,
  Shield,
  CreditCard,
  BarChart3,
  Save,
  History,
  FolderOpen,
  Trash2,
  Calendar,
  FileCode,
  ArrowLeft
} from "lucide-react";
import { AppGeneratorService, type AppGenerationOptions, type GeneratedApp } from "@/services/appGeneratorService";
import { AIDesignService } from "@/services/aiDesignService";
import { ContextualMemoryService } from "@/services/contextualMemoryService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SaaSGeneratorProps {
  onGenerate?: (app: GeneratedApp) => void;
  onClose?: () => void;
}

export const SaaSGenerator = ({ onGenerate, onClose }: SaaSGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [previousApps, setPreviousApps] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant IA pour créer des applications SaaS. Décrivez-moi simplement ce que vous voulez créer et je générerai le code pour vous. Vous pouvez aussi me demander de modifier le code existant !',
      timestamp: new Date()
    }
  ]);
  const { toast } = useToast();

  const [options, setOptions] = useState<AppGenerationOptions>({
    type: 'saas',
    businessName: '',
    description: '',
    industry: 'technologie',
    style: 'modern',
    colorScheme: 'ai-generated',
    includeAuth: true,
    authProviders: ['email'],
    includeDatabase: true,
    includeStripe: false,
    includeAnalytics: false,
    includeStorage: false,
    includeRealtime: false,
    includeNotifications: false,
    includeCMS: false,
    includeChat: false,
    seoOptimized: true,
    pwaEnabled: false
  });

  // Initialisation et récupération de l'utilisateur
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Auth error:', error);
          // Continue in offline mode
          return;
        }
        if (user) {
          setUserId(user.id);
          loadPreviousApps(user.id);
        }
      } catch (error) {
        console.error('Failed to initialize user:', error);
        // Continue in offline mode
      }
    };
    initializeUser();
  }, []);

  // Chargement des apps précédentes
  const loadPreviousApps = async (userId: string) => {
    try {
      const apps = await ContextualMemoryService.getUserGeneratedApps(userId);
      setPreviousApps(apps || []);
    } catch (error) {
      console.error('Erreur chargement apps:', error);
      setPreviousApps([]);
      toast({
        title: "Mode hors ligne",
        description: "Impossible de charger l'historique, mais vous pouvez continuer à générer",
        variant: "destructive"
      });
    }
  };

  // Sauvegarde automatique
  const saveCurrentApp = async (app: GeneratedApp, appName: string) => {
    if (!userId) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour sauvegarder",
        variant: "destructive"
      });
      return null;
    }

    setIsSaving(true);
    try {
      const appId = await ContextualMemoryService.saveGeneratedApp(
        userId,
        appName,
        options.type,
        options.industry,
        app,
        options
      );

      if (appId) {
        setCurrentAppId(appId);
        await loadPreviousApps(userId);
        toast({
          title: "💾 App sauvegardée",
          description: `${appName} a été sauvegardée avec succès`
        });
      }
      return appId;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: "Erreur sauvegarde",
        description: "Impossible de sauvegarder l'application",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Chargement d'une app existante
  const loadApp = (appData: any) => {
    setGeneratedApp(appData.generated_content);
    setOptions(appData.generation_options);
    setCurrentAppId(appData.id);
    setActiveTab("code");
    setShowHistory(false);
    
    const loadMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `📁 Application "${appData.app_name}" chargée ! Vous pouvez maintenant la modifier en me donnant des instructions.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, loadMessage]);
  };

  // Détection de modification vs nouvelle génération
  const isModificationRequest = (message: string) => {
    if (!message || typeof message !== 'string') {
      return false;
    }
    
    const modificationKeywords = [
      'modifie', 'change', 'remplace', 'corrige', 'améliore', 'ajuste',
      'modifier', 'changer', 'remplacer', 'corriger', 'améliorer', 'ajuster',
      'mets à jour', 'update', 'edit', 'fix', 'refactor'
    ];
    
    return modificationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) && generatedApp !== null;
  };

  const handleChatMessage = async (message: string) => {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      toast({
        title: "Message vide",
        description: "Veuillez saisir un message",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    
    // Basculer immédiatement vers l'onglet Code pour voir la génération en streaming
    setActiveTab("code");

    try {
      // Déterminer si c'est une modification ou une nouvelle génération
      if (isModificationRequest(message) && generatedApp) {
        // Mode modification
        const modificationPrompt = `
Voici le code actuel de l'application :

HTML:
${generatedApp.html}

CSS:
${generatedApp.css}

JavaScript:
${generatedApp.javascript}

MODIFICATION DEMANDÉE: ${message}

Modifie le code en appliquant les changements demandés. Réponds avec le format exact:

\`\`\`html
[Code HTML modifié]
\`\`\`

\`\`\`css
[Code CSS modifié]
\`\`\`

\`\`\`javascript
[Code JavaScript modifié]
\`\`\`
        `;

        const modifiedApp = await AppGeneratorService.generateApp(modificationPrompt, options);
        
        setGeneratedApp(modifiedApp);
        
        // Sauvegarder automatiquement la modification
        if (currentAppId && userId) {
          await saveCurrentApp(modifiedApp, options.businessName);
        }

        const modificationMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✏️ Modification appliquée ! L'application a été mise à jour selon vos instructions. ${currentAppId ? 'Les changements ont été sauvegardés automatiquement.' : ''}`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, modificationMessage]);

      } else {
        // Mode génération nouvelle app
        const businessName = extractBusinessName(message);
        const description = message;
        
        const updatedOptions = {
          ...options,
          businessName: businessName || `App-${Date.now()}`,
          description
        };
        
        setOptions(updatedOptions);

        const app = await AppGeneratorService.generateApp(message, updatedOptions);
        
        if (updatedOptions.colorScheme === 'ai-generated') {
          const aiDesign = await AIDesignService.generateDesignSystem(
            updatedOptions.industry,
            updatedOptions.style || 'modern',
            updatedOptions.businessName
          );
          app.css = AIDesignService.applyDesignToCSS(aiDesign, app.css);
        }

        setGeneratedApp(app);
        // L'onglet code est déjà actif depuis le début de la génération
        onGenerate?.(app);
        
        // Sauvegarder automatiquement la nouvelle app
        const appId = await saveCurrentApp(app, updatedOptions.businessName);
        
        // Mettre à jour l'historique et les préférences
        if (userId) {
          await ContextualMemoryService.updateGenerationHistory(userId, message, updatedOptions, true);
          await ContextualMemoryService.updatePreferencesFromUsage(userId, updatedOptions, true);
        }

        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ Application "${updatedOptions.businessName}" générée avec succès ! ${appId ? 'Elle a été sauvegardée automatiquement.' : ''} Vous pouvez voir le code dans l'onglet 'Code' et tester l'aperçu. Continuez à chatter pour la modifier !`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
      }

      toast({
        title: generatedApp ? "Modification appliquée !" : "Application générée !",
        description: generatedApp ? "Code mis à jour avec succès" : `${options.businessName} est prêt`,
      });
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: `Désolé, j'ai rencontré une erreur : ${error.message}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const extractBusinessName = (message: string): string => {
    const patterns = [
      /(?:app(?:lication)?|site|plateforme|système)\s+(?:pour|de|appelée?)\s+([^.!?\n]+)/i,
      /(?:créer|faire|développer)\s+([^.!?\n]+)/i,
      /"([^"]+)"/,
      /appelée?\s+([^.!?\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  };

  const downloadApp = () => {
    if (!generatedApp) return;

    const zip = `
<!-- index.html -->
${generatedApp.html}

/* styles.css */
${generatedApp.css}

// script.js
${generatedApp.javascript}

${generatedApp.databaseSchema ? `
/* database.sql */
${generatedApp.databaseSchema}
` : ''}
    `;

    const blob = new Blob([zip], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${options.businessName.toLowerCase().replace(/\s+/g, '-')}-app.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Modern Header */}
      <div className="border-b border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-accent hover:text-accent-foreground transition-smooth"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center space-x-3">
                <span className="text-2xl">⚡</span>
                <span>Générateur SaaS</span>
                {currentAppId && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {options.businessName}
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {generatedApp ? 'Modifiez votre app via le chat ou générez-en une nouvelle' : 'Décrivez votre idée, je génère le code complet'}
              </p>
            </div>
          </div>
        
          <div className="flex items-center gap-3">
            {/* Modern History Button */}
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <History className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Apps ({previousApps.length})</span>
                  <span className="sm:hidden">{previousApps.length}</span>
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="w-96">
              <SheetHeader>
                <SheetTitle>Mes Applications</SheetTitle>
                <SheetDescription>
                  Vos applications SaaS générées précédemment
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {previousApps.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    Aucune application générée pour le moment
                  </p>
                ) : (
                  previousApps.map((app) => (
                    <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium">{app.app_name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {app.app_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {app.industry}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Logique de suppression ici si nécessaire
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {app.generated_content?.features?.slice(0, 2).join(', ') || 'Application SaaS'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(app.created_at).toLocaleDateString()}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => loadApp(app)}
                            className="h-6 text-xs"
                          >
                            <FolderOpen className="w-3 h-3 mr-1" />
                            Ouvrir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

            {/* Modern Save Button */}
            {generatedApp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveCurrentApp(generatedApp, options.businessName)}
                disabled={isSaving}
                className="hover:bg-accent hover:text-accent-foreground transition-smooth"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span className="hidden sm:inline">Sauvegarder</span>
              </Button>
            )}

            {/* Modern Settings */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="hover:bg-accent hover:text-accent-foreground transition-smooth">
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Paramètres</span>
                </Button>
              </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Configuration</SheetTitle>
              <SheetDescription>
                Personnalisez les options de génération
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-sm font-medium">Type</label>
                <Select value={options.type} onValueChange={(value: any) => setOptions(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-sm font-medium">Style</label>
                <Select value={options.style} onValueChange={(value: any) => setOptions(prev => ({ ...prev, style: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Moderne</SelectItem>
                    <SelectItem value="minimalist">Minimal</SelectItem>
                    <SelectItem value="classic">Classique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="auth" 
                  checked={options.includeAuth} 
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeAuth: checked }))}
                />
                <label htmlFor="auth" className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Authentification
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="database" 
                  checked={options.includeDatabase} 
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeDatabase: checked }))}
                />
                <label htmlFor="database" className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Base de données
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="stripe" 
                  checked={options.includeStripe} 
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeStripe: checked }))}
                />
                <label htmlFor="stripe" className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Paiements Stripe
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="analytics" 
                  checked={options.includeAnalytics} 
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeAnalytics: checked }))}
                />
                <label htmlFor="analytics" className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </label>
              </div>
            </div>
          </SheetContent>
          </Sheet>
          
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1 rounded-lg mx-4 mt-4">
          <TabsTrigger 
            value="chat" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-smooth"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Chat IA</span>
          </TabsTrigger>
          <TabsTrigger 
            value="code" 
            disabled={!generatedApp}
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-smooth"
          >
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline">Code</span>
          </TabsTrigger>
          <TabsTrigger 
            value="preview" 
            disabled={!generatedApp}
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-smooth"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Aperçu</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full flex flex-col bg-background">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={{
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    timestamp: message.timestamp
                  }} 
                />
              ))}
              {isGenerating && <MessageSkeleton />}
            </div>
            <div className="border-t border-border p-4 bg-card/50">
              <ChatInput 
                onSendMessage={handleChatMessage} 
                disabled={isGenerating}
              />
            </div>
          </TabsContent>

          <TabsContent value="code" className="h-full p-4 overflow-y-auto bg-background">
            {isGenerating ? (
              <CodeSkeleton />
            ) : generatedApp ? (
              <CodeEditor
                html={generatedApp.html}
                css={generatedApp.css}
                javascript={generatedApp.javascript}
                database={generatedApp.databaseSchema}
                onDownload={downloadApp}
              />
            ) : (
              <Card className="border-dashed border-2 border-muted">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <FileCode className="w-16 h-16 mx-auto mb-6 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Aucun code généré</h3>
                  <p className="text-sm">Commencez par décrire votre application dans le chat</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preview" className="h-full bg-background">
            {isGenerating ? (
              <PreviewSkeleton />
            ) : generatedApp ? (
              <div className="h-full p-4">
                <WebPreview content={generatedApp} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <Card className="border-dashed border-2 border-muted max-w-md">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Globe className="w-16 h-16 mx-auto mb-6 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Aperçu non disponible</h3>
                    <p className="text-sm">Générez d'abord votre application pour la prévisualiser</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};