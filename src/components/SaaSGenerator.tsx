import { useState } from "react";
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
import { 
  Wand2, 
  Database, 
  Palette, 
  Globe, 
  Code, 
  Download, 
  Rocket,
  Settings,
  Sparkles
} from "lucide-react";
import { AppGeneratorService, type AppGenerationOptions, type GeneratedApp } from "@/services/appGeneratorService";
import { useToast } from "@/hooks/use-toast";

interface SaaSGeneratorProps {
  onGenerate?: (app: GeneratedApp) => void;
}

export const SaaSGenerator = ({ onGenerate }: SaaSGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<GeneratedApp | null>(null);
  const [activeTab, setActiveTab] = useState("config");
  const { toast } = useToast();

  const [options, setOptions] = useState<AppGenerationOptions>({
    type: 'saas',
    businessName: '',
    description: '',
    industry: 'technologie',
    style: 'modern',
    colorScheme: 'blue',
    includeAuth: true,
    includeDatabase: true,
    includeCMS: false
  });

  const handleGenerate = async () => {
    if (!options.businessName || !options.description) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir le nom du business et la description.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const prompt = `Crée une application ${options.type} pour ${options.businessName}. ${options.description}`;
      const app = await AppGeneratorService.generateApp(prompt, options);
      
      setGeneratedApp(app);
      setActiveTab("preview");
      onGenerate?.(app);
      
      toast({
        title: "Application générée !",
        description: `Votre ${options.type} ${options.businessName} est prête.`,
      });
    } catch (error: any) {
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
                        <SelectItem value="blue">Bleu</SelectItem>
                        <SelectItem value="green">Vert</SelectItem>
                        <SelectItem value="purple">Violet</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
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
                    <p className="text-sm text-muted-foreground">Schéma automatique avec données de démo</p>
                  </div>
                  <Switch
                    checked={options.includeDatabase}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeDatabase: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Système de contenu</Label>
                    <p className="text-sm text-muted-foreground">CMS intégré pour gérer le contenu</p>
                  </div>
                  <Switch
                    checked={options.includeCMS}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeCMS: checked }))}
                  />
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5" />
                    Instructions de Déploiement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {generatedApp.deploymentInstructions}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};