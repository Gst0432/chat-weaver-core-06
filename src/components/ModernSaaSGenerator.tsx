import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Code2, 
  ArrowLeft, 
  Play,
  Square,
  Eye,
  Terminal,
  Save,
  Share2,
  Folder,
  Globe,
  Zap
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AdvancedCodeEditor } from "./AdvancedCodeEditor";
import { supabase } from "@/integrations/supabase/client";
import { aiService } from "@/services/aiService";
import { projectService, Project } from "@/services/projectService";
import { webContainerService } from "@/services/webContainerService";

interface ModernSaaSGeneratorProps {
  onClose?: () => void;
}

export const ModernSaaSGenerator = ({ onClose }: ModernSaaSGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [generatedApp, setGeneratedApp] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [aiProvider, setAiProvider] = useState<'openai' | 'deepseek'>('openai');
  const [isWebContainerReady, setIsWebContainerReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    loadProjects();
    initializeWebContainer();
    checkForSharedProject();
  }, []);

  const loadProjects = () => {
    const savedProjects = projectService.getProjects();
    setProjects(savedProjects);
  };

  const initializeWebContainer = async () => {
    try {
      await webContainerService.initialize();
      setIsWebContainerReady(true);
      setTerminalOutput("✅ WebContainer initialisé avec succès\n");
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error);
      setTerminalOutput(`❌ Erreur d'initialisation WebContainer: ${error}\n`);
    }
  };

  const checkForSharedProject = () => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("share");
    if (shared) {
      const sharedProject = projectService.decodeProjectFromUrl(shared);
      if (sharedProject) {
        setGeneratedApp(sharedProject.files);
        setPrompt(sharedProject.prompt || "");
        toast({
          title: "Projet partagé chargé",
          description: "Le projet a été chargé depuis l'URL de partage."
        });
      }
    }
  };

  const generateSaaSApp = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Veuillez décrire votre application SaaS.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedApp(null);
    setTerminalOutput("🤖 Génération en cours avec " + aiProvider.toUpperCase() + "...\n");

    try {
      const result = await aiService.generateFullApp(prompt, aiProvider);
      
      // Convert the result to our file structure format
      const fileStructure: any = {};
      
      if (result.files) {
        Object.entries(result.files).forEach(([path, file]: [string, any]) => {
          const parts = path.split('/');
          let current = fileStructure;
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {
                type: 'folder',
                children: {},
                content: '',
                language: 'text',
                icon: <Folder className="w-4 h-4 text-blue-500" />
              };
            }
            current = current[parts[i]].children;
          }
          
          const fileName = parts[parts.length - 1];
          const ext = fileName.split('.').pop() || 'txt';
          
          current[fileName] = {
            type: 'file',
            content: file.content || file,
            language: getLanguageFromExtension(ext),
            icon: getIconFromExtension(ext)
          };
        });
      }

      setGeneratedApp(fileStructure);
      setTerminalOutput(prev => prev + "✅ Application générée avec succès!\n");
      
      toast({
        title: "Application générée !",
        description: "Votre application SaaS a été créée avec succès."
      });
    } catch (error) {
      console.error('Generation error:', error);
      setTerminalOutput(prev => prev + `❌ Erreur: ${error}\n`);
      toast({
        title: "Erreur de génération",
        description: "Une erreur s'est produite lors de la génération.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getLanguageFromExtension = (ext: string): string => {
    const langMap: { [key: string]: string } = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown', 'sql': 'sql'
    };
    return langMap[ext] || 'text';
  };

  const getIconFromExtension = (ext: string) => {
    return <Code2 className="w-4 h-4 text-blue-500" />;
  };

  const runProject = async () => {
    if (!generatedApp || !isWebContainerReady) return;
    setIsRunning(true);
    setTerminalOutput(prev => prev + "🚀 Démarrage du projet...\n");
    
    try {
      const files = webContainerService.convertFilesToFileSystemTree(generatedApp);
      await webContainerService.mountFiles(files);
      const installResult = await webContainerService.installDependencies();
      setTerminalOutput(prev => prev + installResult.output + "\n");
      
      setTimeout(async () => {
        const url = await webContainerService.getUrl();
        if (url) {
          setPreviewUrl(url);
          setTerminalOutput(prev => prev + `🎉 Serveur prêt sur: ${url}\n`);
        }
      }, 3000);
    } catch (error) {
      setTerminalOutput(prev => prev + `❌ Erreur: ${error}\n`);
      setIsRunning(false);
    }
  };

  const saveProject = () => {
    if (!generatedApp || !prompt.trim()) return;
    if (currentProject) {
      const updated = projectService.updateProject(currentProject.id, {
        name: projectName || currentProject.name, prompt, files: generatedApp
      });
      if (updated) {
        setCurrentProject(updated);
        loadProjects();
        toast({ title: "Projet mis à jour", description: "Le projet a été sauvegardé." });
      }
    } else {
      setShowProjectDialog(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour au chat
          </Button>
        </div>

        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full border border-primary/20">
              <Zap className="w-6 h-6 text-primary" />
              <span className="font-semibold text-primary">Générateur SaaS Avancé</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Environnement de développement IA
            </h1>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Terminal className="w-3 h-3 mr-2" />
                {isWebContainerReady ? 'WebContainer prêt' : 'Initialisation...'}
              </Badge>
              <Select value={aiProvider} onValueChange={(value: 'openai' | 'deepseek') => setAiProvider(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={saveProject} disabled={!generatedApp} variant="outline" size="sm">
                <Save className="w-3 h-3 mr-2" />
                Sauver
              </Button>
            </div>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Description de votre application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Créez un tableau de bord pour gérer les tâches d'équipe..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
                disabled={isGenerating}
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={generateSaaSApp}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex-1 h-12"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-3" />
                      Générer avec {aiProvider.toUpperCase()}
                    </>
                  )}
                </Button>
                {generatedApp && (
                  <Button onClick={runProject} disabled={!isWebContainerReady || isRunning} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Lancer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {generatedApp && (
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">Éditeur</TabsTrigger>
                <TabsTrigger value="preview">Aperçu</TabsTrigger>
              </TabsList>
              <TabsContent value="editor">
                <AdvancedCodeEditor
                  initialFiles={generatedApp}
                  onFilesChange={setGeneratedApp}
                  onRun={runProject}
                  isRunning={isRunning}
                  terminalOutput={terminalOutput}
                />
              </TabsContent>
              <TabsContent value="preview">
                <Card className="h-[600px]">
                  {previewUrl ? (
                    <iframe src={previewUrl} className="w-full h-full border-0" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p>Lancez le projet pour voir l'aperçu</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};