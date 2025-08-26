import { useState, useEffect } from "react";
import { ModernHeader } from "./ModernHeader";
import { ReactCodeEditor } from "./ReactCodeEditor";
import { ReactPreview } from "./ReactPreview";
import { LovableAIChat } from "./LovableAIChat";
import { ProjectManager } from "./ProjectManager";
import { ReactFileExplorer } from "./ReactFileExplorer";
import { TemplateLibrary } from "./TemplateLibrary";
import { CommandPalette } from "./CommandPalette";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  name: string;
  type: 'react-app' | 'component' | 'prototype';
  tsx: string;
  css: string;
  typescript: string;
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
  
  // Editor state - React/TypeScript focused
  const [tsxContent, setTsxContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [tsContent, setTsContent] = useState('');
  const [activeTab, setActiveTab] = useState<'tsx' | 'css' | 'typescript'>('tsx');
  const [showPreviewOnly, setShowPreviewOnly] = useState(true); // Preview par défaut
  const [activeFileId, setActiveFileId] = useState('src/components/App.tsx');

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
          type: (item.app_type as 'react-app' | 'component' | 'prototype') || 'react-app',
          tsx: content?.tsx || content?.html || 'import React from "react";\n\nexport default function App() {\n  return (\n    <div className="p-8">\n      <h1 className="text-2xl font-bold">Nouveau Projet React</h1>\n    </div>\n  );\n}',
          css: content?.css || '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  font-family: Inter, system-ui, sans-serif;\n}',
          typescript: content?.typescript || content?.javascript || '// Types et utilitaires TypeScript\nexport interface User {\n  id: string;\n  name: string;\n}\n\nexport const formatDate = (date: Date) => {\n  return date.toLocaleDateString();\n};',
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
        app_name: template?.name || 'Nouveau Projet React',
        app_type: template?.type || 'react-app',
        industry: 'web-development',
        generated_content: {
          tsx: template?.tsx || 'import React from "react";\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">\n      <div className="max-w-4xl mx-auto">\n        <h1 className="text-4xl font-bold text-gray-800 mb-4">Bienvenue dans votre projet React!</h1>\n        <p className="text-lg text-gray-600 mb-8">Commencez à développer votre application moderne avec React et TypeScript.</p>\n        \n        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">\n          <div className="bg-white p-6 rounded-lg shadow-lg">\n            <h2 className="text-2xl font-semibold mb-4">Composants</h2>\n            <p className="text-gray-600">Créez des composants réutilisables avec TypeScript</p>\n          </div>\n          <div className="bg-white p-6 rounded-lg shadow-lg">\n            <h2 className="text-2xl font-semibold mb-4">Styling</h2>\n            <p className="text-gray-600">Utilisez Tailwind CSS pour un design moderne</p>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n}',
          css: template?.css || '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n/* Custom styles */\nbody {\n  font-family: "Inter", system-ui, sans-serif;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.gradient-bg {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n}',
          typescript: template?.typescript || '// Types et interfaces TypeScript\nexport interface AppProps {\n  title: string;\n  children?: React.ReactNode;\n}\n\nexport interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\n// Utilitaires\nexport const formatDate = (date: Date): string => {\n  return new Intl.DateTimeFormat("fr-FR").format(date);\n};\n\nexport const generateId = (): string => {\n  return Math.random().toString(36).substr(2, 9);\n};'
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
        type: data.app_type as 'react-app' | 'component' | 'prototype',
        tsx: content.tsx,
        css: content.css,
        typescript: content.typescript,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProject(newProject);
      setTsxContent(newProject.tsx);
      setCssContent(newProject.css);
      setTsContent(newProject.typescript);

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
        tsx: tsxContent,
        css: cssContent,
        typescript: tsContent
      };

      const { error } = await supabase
        .from('generated_apps')
        .update({
          generated_content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeProject.id);

      if (error) throw error;

      setActiveProject(prev => prev ? { ...prev, tsx: tsxContent, css: cssContent, typescript: tsContent } : null);
      
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
    setTsxContent(project.tsx);
    setCssContent(project.css);
    setTsContent(project.typescript);
  };

  const handleCodeChange = (code: string, tab: 'tsx' | 'css' | 'typescript') => {
    switch (tab) {
      case 'tsx':
        setTsxContent(code);
        break;
      case 'css':
        setCssContent(code);
        break;
      case 'typescript':
        setTsContent(code);
        break;
    }
  };

  const handleInsertCode = (code: string, tab: 'tsx' | 'css' | 'typescript') => {
    switch (tab) {
      case 'tsx':
        setTsxContent(prev => prev + '\n' + code);
        break;
      case 'css':
        setCssContent(prev => prev + '\n' + code);
        break;
      case 'typescript':
        setTsContent(prev => prev + '\n' + code);
        break;
    }
  };

  const handleFileSelect = (fileId: string, fileName: string, content: string) => {
    setActiveFileId(fileId);
    
    // Déterminer le type de fichier et mettre à jour le contenu approprié
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      setTsxContent(content);
      setActiveTab('tsx');
    } else if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
      setCssContent(content);
      setActiveTab('css');
    } else if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      setTsContent(content);
      setActiveTab('typescript');
    }
  };

  const handleCreateFile = (path: string, type: 'file' | 'folder') => {
    // Logique pour créer un nouveau fichier/dossier
    console.log('Create file:', path, type);
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!activeProject) return;
    
    const interval = setInterval(saveProject, 30000);
    return () => clearInterval(interval);
  }, [activeProject, tsxContent, cssContent, tsContent]);

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
          {/* File Explorer */}
          <ResizablePanel defaultSize={16} minSize={12} maxSize={25}>
            <ReactFileExplorer
              activeFile={activeFileId}
              onSelectFile={handleFileSelect}
              onCreateFile={handleCreateFile}
            />
          </ResizablePanel>

          <ResizableHandle />

          {!showPreviewOnly && (
            <>
              {/* Code Editor */}
              <ResizablePanel defaultSize={34} minSize={25}>
                <ReactCodeEditor
                  tsxContent={tsxContent}
                  cssContent={cssContent}
                  tsContent={tsContent}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onCodeChange={handleCodeChange}
                />
              </ResizablePanel>

              <ResizableHandle />
            </>
          )}

          {/* Preview Panel - Plein écran par défaut */}
          <ResizablePanel defaultSize={showPreviewOnly ? 60 : 30} minSize={20}>
            <ReactPreview
              tsxContent={tsxContent}
              cssContent={cssContent}
              tsContent={tsContent}
              showPreviewOnly={showPreviewOnly}
              onTogglePreview={setShowPreviewOnly}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* AI Chat Panel */}
          <ResizablePanel defaultSize={showPreviewOnly ? 24 : 20} minSize={15} maxSize={35}>
            <LovableAIChat
              currentCode={{
                tsx: tsxContent,
                css: cssContent,
                typescript: tsContent
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