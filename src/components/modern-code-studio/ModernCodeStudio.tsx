import { useState, useEffect } from "react";
import { ModernHeader } from "./ModernHeader";
import { PersistentAIChat } from "./PersistentAIChat";
import { AdvancedPreview } from "./AdvancedPreview";
import { ModernCodeEditor } from "./ModernCodeEditor";
import { ProjectManager } from "./ProjectManager";
import { TemplateLibrary } from "./TemplateLibrary";
import { CommandPalette } from "./CommandPalette";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  name: string;
  type: 'web-app' | 'component' | 'prototype';
  html: string;
  css: string;
  javascript: string;
  created_at: string;
  updated_at: string;
  description?: string;
  thumbnail?: string;
}

export default function ModernCodeStudio() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Editor state
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [jsContent, setJsContent] = useState('');
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'javascript'>('html');

  useEffect(() => {
    loadProjects();
    
    // Command palette keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generated_apps')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const formattedProjects: Project[] = (data || []).map(item => {
        const content = item.generated_content as any;
        return {
          id: item.id,
          name: item.app_name || 'Sans nom',
          type: (item.app_type as 'web-app' | 'component' | 'prototype') || 'web-app',
          html: content?.html || '',
          css: content?.css || '',
          javascript: content?.javascript || '',
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      });
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (template?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const projectData = {
        user_id: user.id,
        app_name: template?.name || 'Nouveau Projet',
        app_type: template?.type || 'web-app',
        industry: 'web-development',
        generated_content: {
          html: template?.html || '<!DOCTYPE html>\n<html>\n<head>\n  <title>Nouveau Projet</title>\n</head>\n<body>\n  <h1>Bienvenue!</h1>\n</body>\n</html>',
          css: template?.css || 'body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }',
          javascript: template?.javascript || 'console.log("Projet initialisé");'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('generated_apps')
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;

      const content = data.generated_content as any;
      const newProject: Project = {
        id: data.id,
        name: data.app_name,
        type: data.app_type as 'web-app' | 'component' | 'prototype',
        html: content.html,
        css: content.css,
        javascript: content.javascript,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProject(newProject);
      setHtmlContent(newProject.html);
      setCssContent(newProject.css);
      setJsContent(newProject.javascript);

      toast({
        title: "Projet créé",
        description: `${newProject.name} a été créé avec succès`
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive"
      });
    }
  };

  const saveProject = async () => {
    if (!activeProject) return;

    try {
      const updatedContent = {
        html: htmlContent,
        css: cssContent,
        javascript: jsContent
      };

      const { error } = await supabase
        .from('generated_apps')
        .update({
          generated_content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeProject.id);

      if (error) throw error;

      setActiveProject(prev => prev ? { ...prev, html: htmlContent, css: cssContent, javascript: jsContent } : null);
      
      toast({
        title: "Sauvegardé",
        description: "Projet sauvegardé automatiquement"
      });
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const loadProject = (project: Project) => {
    setActiveProject(project);
    setHtmlContent(project.html);
    setCssContent(project.css);
    setJsContent(project.javascript);
  };

  const handleCodeChange = (code: string, tab: 'html' | 'css' | 'javascript') => {
    switch (tab) {
      case 'html':
        setHtmlContent(code);
        break;
      case 'css':
        setCssContent(code);
        break;
      case 'javascript':
        setJsContent(code);
        break;
    }
  };

  const handleInsertCode = (code: string, tab: 'html' | 'css' | 'javascript') => {
    switch (tab) {
      case 'html':
        setHtmlContent(prev => prev + '\n' + code);
        break;
      case 'css':
        setCssContent(prev => prev + '\n' + code);
        break;
      case 'javascript':
        setJsContent(prev => prev + '\n' + code);
        break;
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!activeProject) return;
    
    const interval = setInterval(saveProject, 30000);
    return () => clearInterval(interval);
  }, [activeProject, htmlContent, cssContent, jsContent]);

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <ModernHeader 
        activeProject={activeProject}
        onNewProject={() => setShowTemplates(true)}
        onSaveProject={saveProject}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />
      
      <div className="h-[calc(100vh-4rem)] flex">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Project Sidebar */}
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
            <ProjectManager
              projects={projects}
              activeProject={activeProject}
              onLoadProject={loadProject}
              onCreateProject={createProject}
              isLoading={isLoading}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Editor Area */}
          <ResizablePanel defaultSize={42} minSize={30}>
            <ModernCodeEditor
              htmlContent={htmlContent}
              cssContent={cssContent}
              jsContent={jsContent}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCodeChange={handleCodeChange}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <AdvancedPreview
              htmlContent={htmlContent}
              cssContent={cssContent}
              jsContent={jsContent}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* AI Chat Panel */}
          <ResizablePanel defaultSize={15} minSize={12} maxSize={30}>
            <PersistentAIChat
              currentCode={{
                html: htmlContent,
                css: cssContent,
                javascript: jsContent
              }}
              activeTab={activeTab}
              onInsertCode={handleInsertCode}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Overlays */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onAction={(action) => {
          console.log('Command:', action);
          setShowCommandPalette(false);
        }}
      />

      <TemplateLibrary
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={createProject}
      />
    </div>
  );
}