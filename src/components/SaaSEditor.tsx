import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WebPreview } from "@/components/WebPreview";
import { 
  Edit3, 
  Eye, 
  Save, 
  Undo, 
  Redo, 
  Palette, 
  Type,
  Layout,
  Settings,
  Download
} from "lucide-react";
import type { GeneratedApp } from "@/services/appGeneratorService";

interface SaaSEditorProps {
  generatedApp: GeneratedApp;
  onSave?: (updatedApp: GeneratedApp) => void;
  onClose?: () => void;
}

interface HistoryState {
  html: string;
  css: string;
  javascript: string;
  timestamp: number;
}

export const SaaSEditor = ({ generatedApp, onSave, onClose }: SaaSEditorProps) => {
  const [editedApp, setEditedApp] = useState<GeneratedApp>(generatedApp);
  const [activeTab, setActiveTab] = useState("visual");
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [history, setHistory] = useState<HistoryState[]>([
    {
      html: generatedApp.html,
      css: generatedApp.css,
      javascript: generatedApp.javascript,
      timestamp: Date.now()
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Actions d'historique
  const addToHistory = (newState: Omit<HistoryState, 'timestamp'>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...newState, timestamp: Date.now() });
    
    // Garder seulement les 50 derniers états
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      
      setEditedApp(prev => ({
        ...prev,
        html: state.html,
        css: state.css,
        javascript: state.javascript
      }));
      
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      
      setEditedApp(prev => ({
        ...prev,
        html: state.html,
        css: state.css,
        javascript: state.javascript
      }));
      
      setHistoryIndex(newIndex);
    }
  };

  const updateCode = (type: 'html' | 'css' | 'javascript', value: string) => {
    const newApp = { ...editedApp, [type]: value };
    setEditedApp(newApp);
    
    addToHistory({
      html: newApp.html,
      css: newApp.css,
      javascript: newApp.javascript
    });
  };

  const handleSave = () => {
    onSave?.(editedApp);
  };

  const handleDownload = () => {
    const content = `
<!-- index.html -->
${editedApp.html}

<style>
/* styles.css */
${editedApp.css}
</style>

<script>
// script.js
${editedApp.javascript}
</script>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited-app.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Éditeur de couleurs simplifié
  const ColorEditor = () => {
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [secondaryColor, setSecondaryColor] = useState('#f8fafc');
    
    const applyColors = () => {
      const updatedCSS = editedApp.css
        .replace(/#4f46e5/g, primaryColor)
        .replace(/#f8fafc/g, secondaryColor)
        .replace(/rgb\(79,\s*70,\s*229\)/g, hexToRgb(primaryColor))
        .replace(/rgb\(248,\s*250,\s*252\)/g, hexToRgb(secondaryColor));
      
      updateCode('css', updatedCSS);
    };
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? 
        `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 
        hex;
    };

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="primary">Couleur Primaire</Label>
          <div className="flex gap-2">
            <Input
              id="primary"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-16 h-10"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#4f46e5"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="secondary">Couleur Secondaire</Label>
          <div className="flex gap-2">
            <Input
              id="secondary"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-16 h-10"
            />
            <Input
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#f8fafc"
            />
          </div>
        </div>
        
        <Button onClick={applyColors} className="w-full">
          Appliquer les Couleurs
        </Button>
      </div>
    );
  };

  // Éditeur de texte inline
  const TextEditor = () => {
    const [searchText, setSearchText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    
    const replaceInHTML = () => {
      if (!searchText) return;
      
      const updatedHTML = editedApp.html.replace(
        new RegExp(searchText, 'gi'), 
        replaceText
      );
      
      updateCode('html', updatedHTML);
      setSearchText('');
      setReplaceText('');
    };

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="search">Rechercher le texte</Label>
          <Input
            id="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Texte à remplacer..."
          />
        </div>
        
        <div>
          <Label htmlFor="replace">Remplacer par</Label>
          <Input
            id="replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Nouveau texte..."
          />
        </div>
        
        <Button onClick={replaceInHTML} className="w-full">
          Remplacer le Texte
        </Button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header avec actions */}
      <div className="border-b bg-gradient-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Éditeur SaaS</h2>
              <p className="text-sm text-primary-foreground/80">
                Modifiez votre application en temps réel
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex === 0}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Undo className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Redo className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Eye className="w-4 h-4" />
              {isPreviewMode ? 'Code' : 'Aperçu'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panel d'édition */}
        <div className="w-1/3 border-r bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="visual" className="flex items-center gap-1 text-xs">
                <Layout className="w-3 h-3" />
                Visuel
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex items-center gap-1 text-xs">
                <Palette className="w-3 h-3" />
                Couleurs
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-1 text-xs">
                <Type className="w-3 h-3" />
                Texte
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-1 text-xs">
                <Settings className="w-3 h-3" />
                Code
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="visual" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Modifications Rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TextEditor />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>Fonctionnalités:</strong></p>
                      <div className="flex flex-wrap gap-1">
                        {editedApp.features.slice(0, 3).map((feature, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="colors" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Palette de Couleurs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ColorEditor />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="text" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Éditeur de Texte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TextEditor />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">HTML</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={editedApp.html}
                      onChange={(e) => updateCode('html', e.target.value)}
                      className="font-mono text-xs"
                      rows={8}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">CSS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={editedApp.css}
                      onChange={(e) => updateCode('css', e.target.value)}
                      className="font-mono text-xs"
                      rows={8}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="flex-1">
          {isPreviewMode ? (
            <WebPreview 
              content={`${editedApp.html}\n<style>${editedApp.css}</style>\n<script>${editedApp.javascript}</script>`}
            />
          ) : (
            <div className="h-full p-4 overflow-y-auto">
              <Tabs defaultValue="html" className="h-full">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JavaScript</TabsTrigger>
                </TabsList>
                
                <TabsContent value="html" className="h-full">
                  <Textarea
                    value={editedApp.html}
                    onChange={(e) => updateCode('html', e.target.value)}
                    className="font-mono text-sm h-full"
                  />
                </TabsContent>
                
                <TabsContent value="css" className="h-full">
                  <Textarea
                    value={editedApp.css}
                    onChange={(e) => updateCode('css', e.target.value)}
                    className="font-mono text-sm h-full"
                  />
                </TabsContent>
                
                <TabsContent value="js" className="h-full">
                  <Textarea
                    value={editedApp.javascript}
                    onChange={(e) => updateCode('javascript', e.target.value)}
                    className="font-mono text-sm h-full"
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};