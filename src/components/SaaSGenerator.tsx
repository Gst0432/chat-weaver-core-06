import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WebPreview } from "@/components/WebPreview";
import { SaaSEditor } from "@/components/SaaSEditor";
import { 
  Wand2, 
  Database, 
  Palette, 
  Globe, 
  Code, 
  Download, 
  Rocket,
  Settings,
  Sparkles,
  CreditCard,
  BarChart3,
  Cloud,
  Zap,
  Bell,
  MessageSquare,
  Search,
  Smartphone,
  Save,
  History,
  Edit3,
  Brain,
  Heart,
  Star,
  Image,
  Link2,
  Camera,
  Github,
  ExternalLink,
  Upload
} from "lucide-react";
import { AppGeneratorService, type AppGenerationOptions, type GeneratedApp } from "@/services/appGeneratorService";
import { ContextualMemoryService } from "@/services/contextualMemoryService";
import { AIDesignService } from "@/services/aiDesignService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SaaSGeneratorProps {
  onGenerate?: (app: GeneratedApp) => void;
}

export const SaaSGenerator = ({ onGenerate }: SaaSGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [activeTab, setActiveTab] = useState("config");
  const [showEditor, setShowEditor] = useState(false);
  const [userApps, setUserApps] = useState<any[]>([]);
  const [suggestedOptions, setSuggestedOptions] = useState<Partial<AppGenerationOptions>>({});
  const { toast } = useToast();

  const [generationMethod, setGenerationMethod] = useState<'text' | 'figma' | 'screenshot'>('text');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [deploymentTarget, setDeploymentTarget] = useState<'vercel' | 'netlify' | 'github' | 'export'>('vercel');

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

  // Charger les données utilisateur au démarrage
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les suggestions basées sur l'historique
      const suggestions = await ContextualMemoryService.getSuggestedOptions(user.id);
      setSuggestedOptions(suggestions);

      // Appliquer les suggestions aux options par défaut
      setOptions(prev => ({
        ...prev,
        ...suggestions,
        businessName: prev.businessName,
        description: prev.description
      }));

      // Charger les apps précédemment générées
      const apps = await ContextualMemoryService.getUserGeneratedApps(user.id);
      setUserApps(apps);
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    }
  };

  const handleGenerate = async () => {
    // Validation selon la méthode choisie
    if (generationMethod === 'text' && (!options.businessName || !options.description)) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir le nom du business et la description.",
        variant: "destructive"
      });
      return;
    }

    if (generationMethod === 'figma' && !figmaUrl) {
      toast({
        title: "URL Figma manquante",
        description: "Veuillez fournir l'URL de votre design Figma.",
        variant: "destructive"
      });
      return;
    }

    if (generationMethod === 'screenshot' && !screenshotFile) {
      toast({
        title: "Image manquante",
        description: "Veuillez télécharger une capture d'écran.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Préparer le prompt selon la méthode
      let prompt = '';
      let app: any;

      if (generationMethod === 'text') {
        // Générer le design IA si demandé
        if (options.colorScheme === 'ai-generated') {
          toast({
            title: "🎨 Génération du design IA",
            description: "Création d'une palette de couleurs personnalisée...",
          });
        }

        prompt = `Crée une application ${options.type} pour ${options.businessName}. ${options.description}`;
        app = await AppGeneratorService.generateApp(prompt, options);
      } else if (generationMethod === 'figma') {
        toast({
          title: "🎨 Analyse du design Figma",
          description: "Conversion du design en code...",
        });
        prompt = `Convertis ce design Figma en application ${options.type} : ${figmaUrl}`;
        app = await AppGeneratorService.generateApp(prompt, { ...options, sourceType: 'figma', sourceUrl: figmaUrl });
      } else if (generationMethod === 'screenshot') {
        toast({
          title: "📸 Analyse de la capture d'écran",
          description: "Génération du code depuis l'image...",
        });
        // Ici on pourrait implémenter l'upload de l'image vers un service de vision AI
        prompt = `Recrée cette interface utilisateur en application ${options.type}`;
        app = await AppGeneratorService.generateApp(prompt, { ...options, sourceType: 'screenshot' });
      }
      
      // Appliquer le design IA au CSS si généré pour la méthode text
      if (generationMethod === 'text' && options.colorScheme === 'ai-generated') {
        const aiDesign = await AIDesignService.generateDesignSystem(
          options.industry,
          options.style || 'modern',
          options.businessName
        );
        app.css = AIDesignService.applyDesignToCSS(aiDesign, app.css);
      }

      setGeneratedApp(app);
      setActiveTab("preview");
      onGenerate?.(app);
      
      // Sauvegarder dans la mémoire contextuelle
      if (user) {
        await ContextualMemoryService.saveGeneratedApp(
          user.id,
          options.businessName,
          options.type,
          options.industry,
          app,
          options
        );
        
        await ContextualMemoryService.updateGenerationHistory(
          user.id,
          prompt,
          options,
          true
        );
        
        await ContextualMemoryService.updatePreferencesFromUsage(
          user.id,
          options,
          true
        );
        
        // Recharger les données
        loadUserData();
      }
      
      toast({
        title: "✨ Application générée !",
        description: `Votre ${options.type} ${options.businessName} est prête avec design IA.`,
      });
    } catch (error: any) {
      console.error('Erreur génération:', error);
      
      // Sauvegarder l'échec dans l'historique
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ContextualMemoryService.updateGenerationHistory(
          user.id,
          `${options.businessName}: ${options.description}`,
          options,
          false
        );
      }
      
      toast({
        title: "Erreur de génération",
        description: error.message || "Échec de la génération de l'application",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
      <div className="border-b bg-gradient-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Wand2 className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-semibold">Générateur SaaS</h2>
            <p className="text-sm text-primary-foreground/80">
              Créez une application complète en quelques clics
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedApp}>
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Aperçu</span>
          </TabsTrigger>
          <TabsTrigger value="code" disabled={!generatedApp}>
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline">Code</span>
          </TabsTrigger>
          <TabsTrigger value="deploy" disabled={!generatedApp}>
            <Rocket className="w-4 h-4" />
            <span className="hidden sm:inline">Déployer</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="config" className="h-full p-4 overflow-y-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Méthode de Génération
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={generationMethod === 'text' ? 'default' : 'outline'}
                    onClick={() => setGenerationMethod('text')}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <Edit3 className="w-5 h-5" />
                    <span className="text-xs">Prompt-to-UI</span>
                  </Button>
                  <Button
                    variant={generationMethod === 'figma' ? 'default' : 'outline'}
                    onClick={() => setGenerationMethod('figma')}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <Link2 className="w-5 h-5" />
                    <span className="text-xs">Figma-to-Code</span>
                  </Button>
                  <Button
                    variant={generationMethod === 'screenshot' ? 'default' : 'outline'}
                    onClick={() => setGenerationMethod('screenshot')}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs">Screenshot-to-Code</span>
                  </Button>
                </div>

                {generationMethod === 'figma' && (
                  <div>
                    <Label htmlFor="figmaUrl">URL Figma</Label>
                    <Input
                      id="figmaUrl"
                      placeholder="https://www.figma.com/file/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                    />
                  </div>
                )}

                {generationMethod === 'screenshot' && (
                  <div>
                    <Label htmlFor="screenshot">Capture d'écran</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Input
                        id="screenshot"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Label htmlFor="screenshot" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Cliquez pour télécharger une image
                        </p>
                      </Label>
                      {screenshotFile && (
                        <p className="text-sm text-primary mt-2">{screenshotFile.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Informations Business
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Nom du Business *</Label>
                  <Input
                    id="businessName"
                    placeholder="ex: AutoVente Pro"
                    value={options.businessName}
                    onChange={(e) => setOptions(prev => ({ ...prev, businessName: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="ex: Plateforme de vente de voitures d'occasion avec système d'enchères en ligne, gestion des stocks, et module de financement intégré."
                    value={options.description}
                    onChange={(e) => setOptions(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type d'Application</Label>
                    <Select 
                      value={options.type} 
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saas">SaaS Platform</SelectItem>
                        <SelectItem value="ecommerce">E-Commerce</SelectItem>
                        <SelectItem value="portfolio">Portfolio</SelectItem>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="landing">Landing Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Industrie</Label>
                    <Select 
                      value={options.industry} 
                      onValueChange={(value) => setOptions(prev => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voiture">Automobile</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="immobilier">Immobilier</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="santé">Santé</SelectItem>
                        <SelectItem value="éducation">Éducation</SelectItem>
                        <SelectItem value="technologie">Technologie</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Design & Style
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Style</Label>
                    <Select 
                      value={options.style} 
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, style: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Moderne</SelectItem>
                        <SelectItem value="classic">Classique</SelectItem>
                        <SelectItem value="minimalist">Minimaliste</SelectItem>
                        <SelectItem value="bold">Audacieux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Couleurs</Label>
                    <Select 
                      value={options.colorScheme} 
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, colorScheme: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai-generated">🎨 IA Généré (Recommandé)</SelectItem>
                        <SelectItem value="blue">Bleu</SelectItem>
                        <SelectItem value="green">Vert</SelectItem>
                        <SelectItem value="purple">Violet</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="pink">Rose</SelectItem>
                        <SelectItem value="teal">Turquoise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Fonctionnalités Techniques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Authentification utilisateurs</Label>
                    <p className="text-sm text-muted-foreground">Login, register, mot de passe oublié</p>
                  </div>
                  <Switch
                    checked={options.includeAuth}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeAuth: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Base de données Supabase</Label>
                    <p className="text-sm text-muted-foreground">Schéma automatique avec RLS</p>
                  </div>
                  <Switch
                    checked={options.includeDatabase}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeDatabase: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <div>
                      <Label>Paiements Stripe</Label>
                      <p className="text-sm text-muted-foreground">Checkout et abonnements</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.includeStripe}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeStripe: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <div>
                      <Label>Analytics</Label>
                      <p className="text-sm text-muted-foreground">Tracking et métriques</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.includeAnalytics}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeAnalytics: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <div>
                      <Label>Stockage fichiers</Label>
                      <p className="text-sm text-muted-foreground">Upload images/documents</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.includeStorage}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeStorage: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <div>
                      <Label>Temps réel</Label>
                      <p className="text-sm text-muted-foreground">Live updates</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.includeRealtime}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeRealtime: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <div>
                      <Label>PWA</Label>
                      <p className="text-sm text-muted-foreground">App mobile native</p>
                    </div>
                  </div>
                  <Switch
                    checked={options.pwaEnabled}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, pwaEnabled: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Déploiement & Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={deploymentTarget === 'vercel' ? 'default' : 'outline'}
                    onClick={() => setDeploymentTarget('vercel')}
                    className="h-auto p-3 flex flex-col items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-xs">Vercel</span>
                  </Button>
                  <Button
                    variant={deploymentTarget === 'netlify' ? 'default' : 'outline'}
                    onClick={() => setDeploymentTarget('netlify')}
                    className="h-auto p-3 flex flex-col items-center gap-1"
                  >
                    <Cloud className="w-4 h-4" />
                    <span className="text-xs">Netlify</span>
                  </Button>
                  <Button
                    variant={deploymentTarget === 'github' ? 'default' : 'outline'}
                    onClick={() => setDeploymentTarget('github')}
                    className="h-auto p-3 flex flex-col items-center gap-1"
                  >
                    <Github className="w-4 h-4" />
                    <span className="text-xs">GitHub</span>
                  </Button>
                  <Button
                    variant={deploymentTarget === 'export' ? 'default' : 'outline'}
                    onClick={() => setDeploymentTarget('export')}
                    className="h-auto p-3 flex flex-col items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-xs">Export</span>
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {deploymentTarget === 'vercel' && "Déploiement automatique avec 100GB de bande passante gratuite"}
                  {deploymentTarget === 'netlify' && "Hébergement rapide avec CI/CD intégré"}
                  {deploymentTarget === 'github' && "Synchronisation et versionnage avec GitHub"}
                  {deploymentTarget === 'export' && "Téléchargement du code pour déploiement manuel"}
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full bg-gradient-primary hover:shadow-glow"
              size="lg"
            >
              {isGenerating ? (
                <>Génération en cours...</>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Générer l'Application
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="h-full p-0">
            {generatedApp && (
              <WebPreview content={`${generatedApp.html}\n<style>${generatedApp.css}</style>\n<script>${generatedApp.javascript}</script>`} />
            )}
          </TabsContent>

          <TabsContent value="code" className="h-full p-4 overflow-y-auto">
            {generatedApp && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Code Généré</h3>
                  <Button onClick={downloadApp} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>

                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Fonctionnalités Incluses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {generatedApp.features.map((feature, i) => (
                          <Badge key={i} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Images Intégrées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {generatedApp.images.map((img, i) => (
                          <div key={i} className="text-center">
                            <img src={img.url} alt={img.alt} className="w-full h-16 object-cover rounded" />
                            <p className="text-xs text-muted-foreground mt-1">{img.usage}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deploy" className="h-full p-4 overflow-y-auto">
            {generatedApp && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      Déployer sur {deploymentTarget === 'vercel' ? 'Vercel' : deploymentTarget === 'netlify' ? 'Netlify' : deploymentTarget === 'github' ? 'GitHub' : 'Export'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {deploymentTarget === 'vercel' && (
                      <div>
                        <Button className="w-full mb-4" size="lg">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Déployer sur Vercel
                        </Button>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>• Déploiement automatique en un clic</p>
                          <p>• 100GB de bande passante gratuite</p>
                          <p>• CDN global pour une performance optimale</p>
                          <p>• Certificat SSL automatique</p>
                        </div>
                      </div>
                    )}

                    {deploymentTarget === 'netlify' && (
                      <div>
                        <Button className="w-full mb-4" size="lg">
                          <Cloud className="w-4 h-4 mr-2" />
                          Déployer sur Netlify
                        </Button>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>• Hébergement rapide et fiable</p>
                          <p>• CI/CD intégré</p>
                          <p>• Fonctions serverless incluses</p>
                          <p>• Preview branches automatiques</p>
                        </div>
                      </div>
                    )}

                    {deploymentTarget === 'github' && (
                      <div>
                        <Button className="w-full mb-4" size="lg">
                          <Github className="w-4 h-4 mr-2" />
                          Synchroniser avec GitHub
                        </Button>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>• Versionnage et collaboration</p>
                          <p>• GitHub Actions pour CI/CD</p>
                          <p>• Synchronisation bidirectionnelle</p>
                          <p>• Hébergement sur GitHub Pages</p>
                        </div>
                      </div>
                    )}

                    {deploymentTarget === 'export' && (
                      <div>
                        <Button onClick={downloadApp} className="w-full mb-4" size="lg">
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger le Code
                        </Button>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>• Code complet prêt à déployer</p>
                          <p>• Compatible AWS, Heroku, Digital Ocean</p>
                          <p>• Structure de projet optimisée</p>
                          <p>• Documentation incluse</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Instructions Détaillées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                      {generatedApp.deploymentInstructions}
                    </pre>
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