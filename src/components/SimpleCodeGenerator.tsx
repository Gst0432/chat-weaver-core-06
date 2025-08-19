import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Save, 
  Share2, 
  ArrowLeft, 
  User, 
  FolderOpen,
  Code2,
  Download,
  Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { aiService } from "@/services/aiService";
import { projectService, Project } from "@/services/projectService";
import { supabase } from "@/integrations/supabase/client";
import { useQuota } from "@/hooks/useQuota";
import { QuotaDisplay } from "./QuotaDisplay";
import { UpgradePrompt } from "./UpgradePrompt";

interface SimpleCodeGeneratorProps {
  onClose?: () => void;
}

export const SimpleCodeGenerator = ({ onClose }: SimpleCodeGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("// Code généré ici...");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [aiProvider, setAiProvider] = useState<'openai' | 'deepseek'>('openai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const editorRef = useRef<any>(null);
  const { quota, loading, checkQuota, incrementUsage, isTestMode, canGenerate } = useQuota();

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.email || user.id);
      }
    };
    getCurrentUser();

    // Load projects
    const savedProjects = projectService.getProjects();
    setProjects(savedProjects);
  }, []);

  const onGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Veuillez décrire ce que vous voulez coder.",
        variant: "destructive"
      });
      return;
    }

    // Check quota before generating
    if (!canGenerate) {
      setShowUpgradePrompt(true);
      return;
    }

    setIsGenerating(true);
    
    try {
      const generatedCode = await aiService.generateCode(prompt, aiProvider);
      setCode(generatedCode);
      
      // Increment usage for free users
      if (isTestMode) {
        await incrementUsage();
      }
      
      // Create or update project
      if (currentProject === null) {
        const newProject = projectService.saveProject({
          name: `Projet ${projects.length + 1}`,
          prompt,
          files: { "main.js": { content: generatedCode, language: "javascript" } }
        });
        setProjects([...projects, newProject]);
        setCurrentProject(projects.length);
      } else {
        const updated = projectService.updateProject(projects[currentProject].id, {
          prompt,
          files: { "main.js": { content: generatedCode, language: "javascript" } }
        });
        if (updated) {
          const updatedProjects = [...projects];
          updatedProjects[currentProject] = updated;
          setProjects(updatedProjects);
        }
      }
      
      toast({
        title: "Code généré !",
        description: `Code généré avec ${aiProvider.toUpperCase()}`
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Erreur de génération",
        description: "Une erreur s'est produite lors de la génération.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const loadProject = (index: number) => {
    setCurrentProject(index);
    const project = projects[index];
    setPrompt(project.prompt);
    
    // Extract code from files structure
    const firstFile = Object.values(project.files)[0] as any;
    const projectCode = firstFile?.content || firstFile || "// Code non trouvé";
    setCode(projectCode);
    
    if (editorRef.current) {
      editorRef.current.setValue(projectCode);
    }
  };

  const saveCodeFromEditor = () => {
    if (editorRef.current && currentProject !== null) {
      const updatedCode = editorRef.current.getValue();
      const updated = projectService.updateProject(projects[currentProject].id, {
        files: { "main.js": { content: updatedCode, language: "javascript" } }
      });
      
      if (updated) {
        const updatedProjects = [...projects];
        updatedProjects[currentProject] = updated;
        setProjects(updatedProjects);
        toast({
          title: "Projet sauvegardé !",
          description: "Vos modifications ont été enregistrées."
        });
      }
    }
  };

  const shareProject = () => {
    if (currentProject !== null) {
      const project = projects[currentProject];
      const shareUrl = projectService.generateShareUrl(project);
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié !",
        description: "Le lien de partage a été copié dans le presse-papier."
      });
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden font-sans">
      {/* Header fixe */}
      <header className="h-12 bg-card border-b border-border px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-lg font-semibold">Générateur IA</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{userId}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar projets */}
        <aside className="w-48 bg-muted/30 border-r border-border shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="w-4 h-4" />
              Projets ({projects.length})
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucun projet
                </p>
              ) : (
                <div className="space-y-1">
                  {projects.map((project, i) => (
                    <div
                      key={project.id}
                      onClick={() => loadProject(i)}
                      className={`p-2 text-xs rounded cursor-pointer transition-colors ${
                        i === currentProject 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'hover:bg-background text-foreground'
                      }`}
                    >
                      <div className="font-medium truncate">
                        {project.name}
                      </div>
                      <div className="text-muted-foreground truncate mt-1">
                        {project.prompt.substring(0, 30)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Zone principale */}
        <main className="flex-1 flex flex-col p-4 gap-4">
          {/* Quota display */}
          <QuotaDisplay />

          {/* Upgrade prompt overlay */}
          {showUpgradePrompt && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <UpgradePrompt
                title={quota?.remaining_free === 0 ? "Quota épuisé" : "Quota insuffisant"}
                description={quota?.remaining_free === 0 
                  ? "Vous avez utilisé toutes vos générations gratuites. Choisissez un plan pour continuer."
                  : "Vous ne pouvez plus générer en mode gratuit."
                }
                onClose={() => setShowUpgradePrompt(false)}
              />
            </div>
          )}

          {/* Zone de saisie */}
          <Card className="shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  Description
                </CardTitle>
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
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Décris ce que tu veux coder..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={isGenerating || !canGenerate}
              />
              <div className="flex gap-2">
                <Button
                  onClick={onGenerate}
                  disabled={isGenerating || !prompt.trim() || !canGenerate}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {canGenerate ? `Générer avec ${aiProvider.toUpperCase()}` : "Quota épuisé"}
                    </>
                  )}
                </Button>
                <Button
                  onClick={saveCodeFromEditor}
                  disabled={currentProject === null}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauver
                </Button>
                {isTestMode ? (
                  <Button
                    disabled
                    variant="outline"
                    className="opacity-50"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Télécharger (Premium)
                  </Button>
                ) : (
                  <Button
                    onClick={shareProject}
                    disabled={currentProject === null}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                )}
              </div>
              {isTestMode && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md text-xs text-amber-800">
                  <Lock className="w-3 h-3" />
                  Mode test : Téléchargement désactivé. Passez au Premium pour télécharger vos créations.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Éditeur de code */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="h-full border rounded">
                <Editor
                  height="100%"
                  language="javascript"
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  onMount={(editor) => (editorRef.current = editor)}
                  theme="vs-dark"
                  options={{ 
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};