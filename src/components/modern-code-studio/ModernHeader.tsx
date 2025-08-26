import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Code2, 
  Save, 
  Plus, 
  Command, 
  Share, 
  Download,
  Sparkles,
  Clock
} from "lucide-react";
import { Project } from "./ModernCodeStudio";

interface ModernHeaderProps {
  activeProject: Project | null;
  onNewProject: () => void;
  onSaveProject: () => void;
  onOpenCommandPalette: () => void;
}

export const ModernHeader = ({ 
  activeProject, 
  onNewProject, 
  onSaveProject, 
  onOpenCommandPalette 
}: ModernHeaderProps) => {
  return (
    <header className="h-16 bg-card/80 backdrop-blur-sm border-b border-border/60 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
            <Code2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Code Studio
            </h1>
            <p className="text-xs text-muted-foreground">Plateforme de développement moderne</p>
          </div>
        </div>
        
        {activeProject && (
          <div className="flex items-center gap-2 ml-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">{activeProject.name}</span>
            <Badge variant="outline" className="text-xs">
              {activeProject.type === 'web-app' ? 'App Web' : 
               activeProject.type === 'component' ? 'Composant' : 'Prototype'}
            </Badge>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Sauvegardé
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Command className="w-4 h-4" />
          <span className="text-xs">⌘K</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNewProject}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveProject}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Sauvegarder</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Share className="w-4 h-4" />
          <span className="hidden sm:inline">Partager</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exporter</span>
        </Button>
        
        <Button
          size="sm"
          className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-primary-foreground flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Améliorer avec l'IA</span>
        </Button>
      </div>
    </header>
  );
};