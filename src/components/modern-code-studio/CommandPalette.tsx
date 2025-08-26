import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Command,
  Search,
  Plus,
  Save,
  Download,
  Share,
  Code2,
  Palette,
  Zap,
  Settings,
  FileCode2,
  Globe,
  Sparkles,
  Eye,
  Copy,
  Trash2,
  Folder,
  Terminal,
  Lightbulb
} from "lucide-react";

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  category: 'navigation' | 'creation' | 'editing' | 'ai' | 'project';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export const CommandPalette = ({ isOpen, onClose, onAction }: CommandPaletteProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'switch-html',
      label: 'Aller à HTML',
      description: 'Basculer vers l\'éditeur HTML',
      icon: FileCode2,
      shortcut: '⌘1',
      category: 'navigation',
      action: () => onAction('switch-html')
    },
    {
      id: 'switch-css',
      label: 'Aller à CSS',
      description: 'Basculer vers l\'éditeur CSS',
      icon: Palette,
      shortcut: '⌘2',
      category: 'navigation',
      action: () => onAction('switch-css')
    },
    {
      id: 'switch-js',
      label: 'Aller à JavaScript',
      description: 'Basculer vers l\'éditeur JavaScript',
      icon: Zap,
      shortcut: '⌘3',
      category: 'navigation',
      action: () => onAction('switch-js')
    },
    {
      id: 'toggle-preview',
      label: 'Basculer l\'aperçu',
      description: 'Afficher/masquer la prévisualisation',
      icon: Eye,
      shortcut: '⌘P',
      category: 'navigation',
      action: () => onAction('toggle-preview')
    },

    // Création
    {
      id: 'new-project',
      label: 'Nouveau projet',
      description: 'Créer un nouveau projet vide',
      icon: Plus,
      shortcut: '⌘N',
      category: 'creation',
      action: () => onAction('new-project')
    },
    {
      id: 'new-component',
      label: 'Nouveau composant',
      description: 'Créer un nouveau composant',
      icon: FileCode2,
      category: 'creation',
      action: () => onAction('new-component')
    },
    {
      id: 'new-template',
      label: 'Depuis un template',
      description: 'Créer un projet à partir d\'un template',
      icon: Sparkles,
      category: 'creation',
      action: () => onAction('templates')
    },

    // Édition
    {
      id: 'save-project',
      label: 'Sauvegarder',
      description: 'Sauvegarder le projet actuel',
      icon: Save,
      shortcut: '⌘S',
      category: 'editing',
      action: () => onAction('save-project')
    },
    {
      id: 'copy-code',
      label: 'Copier le code',
      description: 'Copier le code de l\'onglet actuel',
      icon: Copy,
      shortcut: '⌘C',
      category: 'editing',
      action: () => onAction('copy-code')
    },
    {
      id: 'format-code',
      label: 'Formater le code',
      description: 'Formater automatiquement le code',
      icon: Code2,
      shortcut: '⌘⇧F',
      category: 'editing',
      action: () => onAction('format-code')
    },

    // IA
    {
      id: 'ai-generate',
      label: 'Générer avec l\'IA',
      description: 'Générer du code avec l\'assistance IA',
      icon: Sparkles,
      shortcut: '⌘AI',
      category: 'ai',
      action: () => onAction('ai-generate')
    },
    {
      id: 'ai-improve',
      label: 'Améliorer avec l\'IA',
      description: 'Améliorer le code existant avec l\'IA',
      icon: Lightbulb,
      category: 'ai',
      action: () => onAction('ai-improve')
    },
    {
      id: 'ai-debug',
      label: 'Débugger avec l\'IA',
      description: 'Analyser et corriger les erreurs',
      icon: Terminal,
      category: 'ai',
      action: () => onAction('ai-debug')
    },

    // Projet
    {
      id: 'export-project',
      label: 'Exporter',
      description: 'Exporter le projet en HTML',
      icon: Download,
      shortcut: '⌘E',
      category: 'project',
      action: () => onAction('export-project')
    },
    {
      id: 'share-project',
      label: 'Partager',
      description: 'Partager le projet avec un lien',
      icon: Share,
      category: 'project',
      action: () => onAction('share-project')
    },
    {
      id: 'project-settings',
      label: 'Paramètres du projet',
      description: 'Configurer les paramètres du projet',
      icon: Settings,
      category: 'project',
      action: () => onAction('project-settings')
    },
    {
      id: 'delete-project',
      label: 'Supprimer le projet',
      description: 'Supprimer définitivement le projet',
      icon: Trash2,
      category: 'project',
      action: () => onAction('delete-project')
    }
  ];

  const filteredCommands = commands.filter(command => 
    command.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    command.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, CommandAction[]>);

  const categoryLabels = {
    navigation: 'Navigation',
    creation: 'Création',
    editing: 'Édition',
    ai: 'Intelligence Artificielle',
    project: 'Projet'
  };

  const categoryIcons = {
    navigation: Globe,
    creation: Plus,
    editing: Code2,
    ai: Sparkles,
    project: Folder
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const executeCommand = (command: CommandAction, index: number) => {
    setSelectedIndex(index);
    command.action();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-background/95 backdrop-blur-sm border border-border/60">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/60">
          <Command className="w-5 h-5 text-primary" />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tapez une commande ou recherchez..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 focus-visible:ring-0 bg-transparent"
              autoFocus
            />
          </div>
          <Badge variant="outline" className="text-xs">
            ⌘K
          </Badge>
        </div>

        {/* Commands */}
        <ScrollArea className="max-h-96">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune commande trouvée</p>
              <p className="text-xs opacity-60">Essayez un autre terme de recherche</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedCommands).map(([category, categoryCommands]) => {
                const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
                
                return (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <CategoryIcon className="w-3 h-3" />
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </div>
                    
                    <div className="space-y-1">
                      {categoryCommands.map((command, index) => {
                        const globalIndex = filteredCommands.indexOf(command);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <div
                            key={command.id}
                            onClick={() => executeCommand(command, globalIndex)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-accent/50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-md ${
                              isSelected
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <command.icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${
                                  isSelected ? 'text-primary' : 'text-foreground'
                                }`}>
                                  {command.label}
                                </span>
                                {command.shortcut && (
                                  <Badge variant="secondary" className="text-xs h-5 ml-2">
                                    {command.shortcut}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {command.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">↑↓</kbd>
              <span>naviguer</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">↵</kbd>
              <span>sélectionner</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">esc</kbd>
              <span>fermer</span>
            </div>
          </div>
          <div className="text-xs opacity-60">
            {filteredCommands.length} commande(s)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};