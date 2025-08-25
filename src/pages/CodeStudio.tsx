import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Save, 
  Trash2, 
  FileCode2, 
  Globe, 
  Smartphone, 
  Tablet, 
  Monitor,
  Download,
  Code2,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { WebPreview } from "@/components/WebPreview";
import { CodeStudioChat } from "@/components/CodeStudioChat";

interface SavedCode {
  id: string;
  name: string;
  type: 'web-app' | 'component' | 'prototype';
  html: string;
  css: string;
  javascript: string;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type ActiveTab = 'html' | 'css' | 'javascript';

export default function CodeStudio() {
  const { theme } = useTheme();
  const [savedCodes, setSavedCodes] = useState<SavedCode[]>([]);
  const [activeCode, setActiveCode] = useState<SavedCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('html');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [framework, setFramework] = useState<'react' | 'vanilla'>('react');
  
  // Code content state
  const [htmlContent, setHtmlContent] = useState('<!DOCTYPE html>\n<html lang="fr">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Nouveau Projet</title>\n</head>\n<body>\n    <h1>Bienvenue dans Code Studio</h1>\n    <p>Commencez à créer votre application web ici.</p>\n</body>\n</html>');
  const [cssContent, setCssContent] = useState('/* Styles CSS */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n    background-color: #f5f5f5;\n}\n\nh1 {\n    color: #333;\n    text-align: center;\n}');
  const [jsContent, setJsContent] = useState('// JavaScript\nconsole.log("Code Studio initialisé!");\n\n// Votre code JavaScript ici');
  
  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeType, setNewCodeType] = useState<'web-app' | 'component' | 'prototype'>('web-app');

  useEffect(() => {
    loadSavedCodes();
  }, []);

  const loadSavedCodes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generated_apps')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const formattedCodes: SavedCode[] = (data || []).map(item => {
        const generatedContent = typeof item.generated_content === 'object' && item.generated_content 
          ? item.generated_content as any 
          : {};
        
        return {
          id: item.id,
          name: item.app_name || 'Sans nom',
          type: (item.app_type === 'web-app' || item.app_type === 'component' || item.app_type === 'prototype') 
            ? item.app_type 
            : 'web-app',
          html: generatedContent.html || '',
          css: generatedContent.css || '',
          javascript: generatedContent.javascript || '',
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      });
      
      setSavedCodes(formattedCodes);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes sauvegardés",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCode = (code: SavedCode) => {
    setActiveCode(code);
    setHtmlContent(code.html || '');
    setCssContent(code.css || '');
    setJsContent(code.javascript || '');
    toast({
      title: "Code chargé",
      description: `${code.name} a été chargé avec succès`
    });
  };

  const saveCode = async () => {
    if (!newCodeName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom pour votre code",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const generatedContent = {
        html: htmlContent,
        css: cssContent,
        javascript: jsContent
      };

      const codeData = {
        user_id: user.id,
        app_name: newCodeName.trim(),
        app_type: newCodeType,
        industry: 'web-development',
        generated_content: generatedContent,
        updated_at: new Date().toISOString()
      };

      let result;
      if (activeCode) {
        // Update existing code
        result = await supabase
          .from('generated_apps')
          .update(codeData)
          .eq('id', activeCode.id)
          .select()
          .single();
      } else {
        // Create new code
        result = await supabase
          .from('generated_apps')
          .insert({
            ...codeData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: "Succès",
        description: `Code "${newCodeName}" sauvegardé avec succès`
      });

      setShowSaveDialog(false);
      setNewCodeName('');
      loadSavedCodes();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le code",
        variant: "destructive"
      });
    }
  };

  const newCode = () => {
    setActiveCode(null);
    setHtmlContent('<!DOCTYPE html>\n<html lang="fr">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Nouveau Projet</title>\n</head>\n<body>\n    <h1>Nouveau Projet</h1>\n    <p>Commencez votre création ici.</p>\n</body>\n</html>');
    setCssContent('/* Styles CSS */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n    background-color: #f5f5f5;\n}');
    setJsContent('// JavaScript\nconsole.log("Nouveau projet initialisé!");');
    setActiveTab('html');
  };

  const deleteCode = async (codeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) return;

    try {
      const { error } = await supabase
        .from('generated_apps')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Code supprimé avec succès"
      });

      if (activeCode?.id === codeId) {
        newCode();
      }
      loadSavedCodes();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code",
        variant: "destructive"
      });
    }
  };

  const exportCode = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeCode?.name || 'Export Code Studio'}</title>
    <style>
${cssContent}
    </style>
</head>
<body>
${htmlContent.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
    <script>
${jsContent}
    </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCode?.name || 'code-studio-export'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export réussi",
      description: "Fichier HTML téléchargé avec succès"
    });
  };

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'html': return htmlContent;
      case 'css': return cssContent;
      case 'javascript': return jsContent;
      default: return '';
    }
  };

  const updateCurrentContent = (value: string) => {
    switch (activeTab) {
      case 'html': setHtmlContent(value || ''); break;
      case 'css': setCssContent(value || ''); break;
      case 'javascript': setJsContent(value || ''); break;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web-app': return <Globe className="w-4 h-4" />;
      case 'component': return <FileCode2 className="w-4 h-4" />;
      case 'prototype': return <Code2 className="w-4 h-4" />;
      default: return <FileCode2 className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'web-app': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'component': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'prototype': return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
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
    setActiveTab(tab);
    toast({
      title: "Code inséré",
      description: `Code ajouté dans l'onglet ${tab.toUpperCase()}`
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Code2 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Code Studio</h1>
            </div>
            {activeCode && (
              <Badge variant="outline" className="flex items-center space-x-1">
                {getTypeIcon(activeCode.type)}
                <span>{activeCode.name}</span>
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={newCode} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau
            </Button>
            
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" onClick={() => {
                  setNewCodeName(activeCode?.name || '');
                  setNewCodeType(activeCode?.type || 'web-app');
                }}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sauvegarder le code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nom du projet</label>
                    <Input
                      value={newCodeName}
                      onChange={(e) => setNewCodeName(e.target.value)}
                      placeholder="Nom de votre projet..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select value={newCodeType} onValueChange={(value: any) => setNewCodeType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web-app">Application Web</SelectItem>
                        <SelectItem value="component">Composant</SelectItem>
                        <SelectItem value="prototype">Prototype</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={saveCode} className="flex-1">Sauvegarder</Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annuler</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={exportCode} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="vertical" className="h-full">
          {/* Code Editor Area */}
          <ResizablePanel defaultSize={isChatVisible ? 70 : 100} minSize={50}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Saved Codes */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <Card className="h-full rounded-none border-r border-t-0">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">Codes sauvegardés</h3>
                  </div>
                  
                  <ScrollArea className="h-[calc(100%-60px)]">
                    <div className="p-2">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : savedCodes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileCode2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucun code sauvegardé</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {savedCodes.map((code) => (
                            <div
                              key={code.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                activeCode?.id === code.id
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-card hover:bg-accent border-border'
                              }`}
                              onClick={() => loadCode(code)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {getTypeIcon(code.type)}
                                  <span className="font-medium text-sm text-foreground truncate">
                                    {code.name}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCode(code.id);
                                  }}
                                  className="w-6 h-6 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              <Badge variant="secondary" className={`text-xs ${getTypeBadgeColor(code.type)}`}>
                                {code.type === 'web-app' ? 'App Web' : 
                                 code.type === 'component' ? 'Composant' : 'Prototype'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </ResizablePanel>

              <ResizableHandle />

              {/* Center Panel - Code Editor */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <Card className="h-full rounded-none border-r border-t-0">
                  {/* Editor Tabs */}
                  <div className="flex border-b border-border bg-muted/30">
                    {(['html', 'css', 'javascript'] as ActiveTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === tab
                            ? 'bg-background text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Editor */}
                  <div className="h-[calc(100%-49px)]">
                    <Editor
                      height="100%"
                      language={activeTab === 'javascript' ? 'javascript' : activeTab}
                      value={getCurrentContent()}
                      onChange={(value) => updateCurrentContent(value || '')}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        automaticLayout: true,
                        wordWrap: 'on',
                        tabSize: 2,
                        insertSpaces: true
                      }}
                    />
                  </div>
                </Card>
              </ResizablePanel>

              <ResizableHandle />

              {/* Right Panel - Web Preview */}
              <ResizablePanel defaultSize={30} minSize={25}>
                <Card className="h-full rounded-none border-t-0">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Aperçu Web</h3>
                      
                      <div className="flex items-center space-x-2">
                        {/* View Mode Buttons */}
                        <div className="flex border border-border rounded-lg p-1">
                          <Button
                            variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('desktop')}
                            className="w-8 h-8 p-0"
                          >
                            <Monitor className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'tablet' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('tablet')}
                            className="w-8 h-8 p-0"
                          >
                            <Tablet className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('mobile')}
                            className="w-8 h-8 p-0"
                          >
                            <Smartphone className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Area */}
                  <div className="h-[calc(100%-73px)] p-4">
                    <WebPreview 
                      content={{
                        html: htmlContent,
                        css: cssContent,
                        javascript: jsContent
                      }}
                    />
                  </div>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Chat Panel */}
          {isChatVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10 h-6 w-6 p-0"
                    onClick={() => setIsChatVisible(false)}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <CodeStudioChat
                    currentCode={{
                      html: htmlContent,
                      css: cssContent,
                      javascript: jsContent
                    }}
                    activeTab={activeTab}
                    onInsertCode={handleInsertCode}
                    selectedModel="gpt-4.1-2025-04-14"
                    framework={framework}
                    onFrameworkChange={setFramework}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        
        {/* Chat Toggle Button */}
        {!isChatVisible && (
          <Button
            variant="default"
            size="sm"
            className="fixed bottom-4 right-4 h-10 px-4 bg-gradient-primary shadow-elegant"
            onClick={() => setIsChatVisible(true)}
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            Assistant IA
          </Button>
        )}
      </div>
    </div>
  );
}