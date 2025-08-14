import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebPreview } from "@/components/WebPreview";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
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
  Calendar
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadPreviousApps(user.id);
      }
    };
    initializeUser();
  }, []);

  // Chargement des apps précédentes
  const loadPreviousApps = async (userId: string) => {
    try {
      const apps = await ContextualMemoryService.getUserGeneratedApps(userId);
      setPreviousApps(apps);
    } catch (error) {
      console.error('Erreur chargement apps:', error);
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
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

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
        setActiveTab("code");
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
    <div className="h-full flex flex-col">
      {/* Header avec settings et bouton fermer */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Générateur SaaS IA
            {currentAppId && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {options.businessName}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {generatedApp ? 'Modifiez votre app via le chat ou générez-en une nouvelle' : 'Décrivez votre idée, je génère le code'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Bouton Historique */}
          <Sheet open={showHistory} onOpenChange={setShowHistory}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="w-4 h-4 mr-2" />
                Apps ({previousApps.length})
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

          {/* Bouton Sauvegarder */}
          {generatedApp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveCurrentApp(generatedApp, options.businessName)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          )}

          {/* Paramètres */}
          <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
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
          
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              Retour au Chat
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="code" disabled={!generatedApp}>
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline">Code</span>
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedApp}>
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Aperçu</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              {isGenerating && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours...
                </div>
              )}
            </div>
            <div className="border-t p-4">
              <ChatInput 
                onSendMessage={handleChatMessage} 
                disabled={isGenerating}
                sttProvider="openai"
              />
            </div>
          </TabsContent>

          <TabsContent value="code" className="h-full p-4 overflow-y-auto">
            {generatedApp ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Code généré</h3>
                  <Button onClick={downloadApp} variant="outline" size="sm">
                    <Code className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
                
                <Tabs defaultValue="html" className="w-full">
                  <TabsList>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="css">CSS</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    {generatedApp.databaseSchema && (
                      <TabsTrigger value="db">Database</TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="html">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                      <code>{generatedApp.html}</code>
                    </pre>
                  </TabsContent>
                  
                  <TabsContent value="css">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                      <code>{generatedApp.css}</code>
                    </pre>
                  </TabsContent>
                  
                  <TabsContent value="js">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                      <code>{generatedApp.javascript}</code>
                    </pre>
                  </TabsContent>
                  
                  {generatedApp.databaseSchema && (
                    <TabsContent value="db">
                      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                        <code>{generatedApp.databaseSchema}</code>
                      </pre>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Générez d'abord une application pour voir le code
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="h-full">
            {generatedApp ? (
              <WebPreview 
                content={`${generatedApp.html}\n<style>${generatedApp.css}</style>\n<script>${generatedApp.javascript}</script>`}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Générez d'abord une application pour la prévisualiser
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};