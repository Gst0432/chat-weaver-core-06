import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileCode2, 
  Palette, 
  Zap, 
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useState } from "react";

interface ModernCodeEditorProps {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  activeTab: 'html' | 'css' | 'javascript';
  onTabChange: (tab: 'html' | 'css' | 'javascript') => void;
  onCodeChange: (code: string, tab: 'html' | 'css' | 'javascript') => void;
}

export const ModernCodeEditor = ({
  htmlContent,
  cssContent,
  jsContent,
  activeTab,
  onTabChange,
  onCodeChange
}: ModernCodeEditorProps) => {
  const { theme } = useTheme();
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'html': return htmlContent;
      case 'css': return cssContent;
      case 'javascript': return jsContent;
      default: return '';
    }
  };

  const getLanguage = () => {
    switch (activeTab) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'javascript': return 'javascript';
      default: return 'html';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'html': return <FileCode2 className="w-3 h-3" />;
      case 'css': return <Palette className="w-3 h-3" />;
      case 'javascript': return <Zap className="w-3 h-3" />;
      default: return <FileCode2 className="w-3 h-3" />;
    }
  };

  const getLineCount = () => {
    return getCurrentContent().split('\n').length;
  };

  const getCharCount = () => {
    return getCurrentContent().length;
  };

  const editorOptions = {
    fontSize,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
    lineHeight: 1.6,
    minimap: {
      enabled: isMinimapVisible
    },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    renderLineHighlight: 'all' as const,
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line' as const,
    formatOnPaste: true,
    formatOnType: true,
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
      showConstructors: true,
      showFields: true,
      showVariables: true,
      showClasses: true,
      showStructs: true,
      showInterfaces: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showConstants: true,
      showEnums: true,
      showEnumMembers: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    }
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/90 border-border/60 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-muted/30 to-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-secondary to-secondary/70 rounded-md flex items-center justify-center">
              {getTabIcon(activeTab)}
            </div>
            <h3 className="font-semibold text-sm">Éditeur de Code</h3>
            <Badge variant="outline" className="text-xs">
              {activeTab.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimapVisible(!isMinimapVisible)}
              className="h-7 px-2"
            >
              {isMinimapVisible ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize(fontSize === 14 ? 16 : 14)}
              className="h-7 px-2 text-xs"
            >
              {fontSize}px
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as any)} className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="html" className="text-xs flex items-center gap-1">
              <FileCode2 className="w-3 h-3" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" className="text-xs flex items-center gap-1">
              <Palette className="w-3 h-3" />
              CSS
            </TabsTrigger>
            <TabsTrigger value="javascript" className="text-xs flex items-center gap-1">
              <Zap className="w-3 h-3" />
              JavaScript
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 p-4 pt-2">
          <TabsContent value="html" className="h-full m-0">
            <div className="h-full border border-border/60 rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm">
              <Editor
                height="100%"
                language="html"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={htmlContent}
                onChange={(value) => onCodeChange(value || '', 'html')}
                options={editorOptions}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="css" className="h-full m-0">
            <div className="h-full border border-border/60 rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm">
              <Editor
                height="100%"
                language="css"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={cssContent}
                onChange={(value) => onCodeChange(value || '', 'css')}
                options={editorOptions}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="javascript" className="h-full m-0">
            <div className="h-full border border-border/60 rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm">
              <Editor
                height="100%"
                language="javascript"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={jsContent}
                onChange={(value) => onCodeChange(value || '', 'javascript')}
                options={editorOptions}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{getLanguage().toUpperCase()}</span>
          <span>{getLineCount()} lignes</span>
          <span>{getCharCount()} caractères</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs h-5">
            UTF-8
          </Badge>
          <Badge variant="outline" className="text-xs h-5">
            LF
          </Badge>
        </div>
      </div>
    </Card>
  );
};