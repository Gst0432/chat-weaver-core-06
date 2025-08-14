import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  BarChart3
} from "lucide-react";
import { AppGeneratorService, type AppGenerationOptions, type GeneratedApp } from "@/services/appGeneratorService";
import { AIDesignService } from "@/services/aiDesignService";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SaaSGeneratorProps {
  onGenerate?: (app: GeneratedApp) => void;
}

export const SaaSGenerator = ({ onGenerate }: SaaSGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant IA pour créer des applications SaaS. Décrivez-moi simplement ce que vous voulez créer et je générerai le code pour vous.',
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
      // Analyser le message pour extraire les infos
      const businessName = extractBusinessName(message);
      const description = message;
      
      const updatedOptions = {
        ...options,
        businessName: businessName || `App-${Date.now()}`,
        description
      };
      
      setOptions(updatedOptions);

      // Générer l'application
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✨ J'ai généré votre application "${updatedOptions.businessName}" ! Le code est maintenant disponible dans l'onglet Code. Vous pouvez le prévisualiser ou le déployer.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      toast({
        title: "Application générée !",
        description: `${updatedOptions.businessName} est prêt`,
      });
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: `Désolé, j'ai rencontré une erreur lors de la génération : ${error.message}`,
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
      {/* Header avec settings */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Générateur SaaS IA</h2>
          <p className="text-sm text-muted-foreground">
            Décrivez votre idée, je génère le code
          </p>
        </div>
        
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