import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  FileCode2, 
  Globe, 
  Code2, 
  Trash2,
  Clock,
  Star,
  Folder,
  Filter
} from "lucide-react";
import { Project } from "./ModernCodeStudio";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectManagerProps {
  projects: Project[];
  activeProject: Project | null;
  onLoadProject: (project: Project) => void;
  onCreateProject: () => void;
  isLoading: boolean;
}

export const ProjectManager = ({ 
  projects, 
  activeProject, 
  onLoadProject, 
  onCreateProject,
  isLoading 
}: ProjectManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'web-app' | 'component' | 'prototype'>('all');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web-app': return <Globe className="w-4 h-4" />;
      case 'component': return <FileCode2 className="w-4 h-4" />;
      case 'prototype': return <Code2 className="w-4 h-4" />;
      default: return <FileCode2 className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'web-app': return 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600';
      case 'component': return 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-600';
      case 'prototype': return 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600';
      default: return 'from-gray-500/10 to-gray-600/5 border-gray-500/20 text-gray-600';
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || project.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const recentProjects = projects.slice(0, 3);
  const starredProjects = projects.filter(p => p.description?.includes('starred'));

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/90 border-border/60">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Projets</h3>
            <Badge variant="outline" className="text-xs">
              {projects.length}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={onCreateProject}
            className="h-7 px-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          <Button
            variant={filterType === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="h-6 px-2 text-xs"
          >
            Tous
          </Button>
          <Button
            variant={filterType === 'web-app' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('web-app')}
            className="h-6 px-2 text-xs"
          >
            <Globe className="w-3 h-3" />
          </Button>
          <Button
            variant={filterType === 'component' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('component')}
            className="h-6 px-2 text-xs"
          >
            <FileCode2 className="w-3 h-3" />
          </Button>
          <Button
            variant={filterType === 'prototype' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('prototype')}
            className="h-6 px-2 text-xs"
          >
            <Code2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Actions rapides
              </h4>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateProject}
                  className="w-full justify-start h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Nouveau projet
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs"
                >
                  <Filter className="w-3 h-3 mr-2" />
                  Templates
                </Button>
              </div>
            </div>

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Récents
                </h4>
                <div className="space-y-1">
                  {recentProjects.map((project) => (
                    <div
                      key={`recent-${project.id}`}
                      onClick={() => onLoadProject(project)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        activeProject?.id === project.id
                          ? 'bg-gradient-to-r from-primary/10 to-primary-glow/5 border-primary/30 shadow-sm'
                          : 'bg-card/50 hover:bg-accent/50 border-border/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded bg-gradient-to-r ${getTypeColor(project.type)} border`}>
                          {getTypeIcon(project.type)}
                        </div>
                        <span className="text-xs font-medium truncate flex-1">
                          {project.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(project.updated_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Projects */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Folder className="w-3 h-3" />
                Tous les projets ({filteredProjects.length})
              </h4>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">
                    {searchQuery ? 'Aucun projet trouvé' : 'Aucun projet créé'}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCreateProject}
                      className="mt-2 h-6 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Créer le premier
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onLoadProject(project)}
                      className={`group p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        activeProject?.id === project.id
                          ? 'bg-gradient-to-r from-primary/10 to-primary-glow/5 border-primary/30 shadow-sm'
                          : 'bg-card/50 hover:bg-accent/50 border-border/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded bg-gradient-to-r ${getTypeColor(project.type)} border`}>
                            {getTypeIcon(project.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium truncate">
                              {project.name}
                            </h5>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(project.updated_at), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete project:', project.id);
                          }}
                          className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={`text-xs h-5 bg-gradient-to-r ${getTypeColor(project.type)}`}
                      >
                        {project.type === 'web-app' ? 'App Web' : 
                         project.type === 'component' ? 'Composant' : 'Prototype'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};