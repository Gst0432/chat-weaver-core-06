import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileCode2, 
  Palette, 
  Type,
  Settings,
  Eye,
  EyeOff,
  Zap
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

interface ReactCodeEditorProps {
  tsxContent: string;
  cssContent: string;
  tsContent: string;
  activeTab: 'tsx' | 'css' | 'typescript';
  onTabChange: (tab: 'tsx' | 'css' | 'typescript') => void;
  onCodeChange: (code: string, tab: 'tsx' | 'css' | 'typescript') => void;
}

export const ReactCodeEditor = ({
  tsxContent,
  cssContent,
  tsContent,
  activeTab,
  onTabChange,
  onCodeChange
}: ReactCodeEditorProps) => {
  const { theme } = useTheme();
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'tsx': return tsxContent;
      case 'css': return cssContent;
      case 'typescript': return tsContent;
      default: return '';
    }
  };

  const getLanguage = () => {
    switch (activeTab) {
      case 'tsx': return 'typescript';
      case 'css': return 'css';
      case 'typescript': return 'typescript';
      default: return 'typescript';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'tsx': return <FileCode2 className="w-3 h-3" />;
      case 'css': return <Palette className="w-3 h-3" />;
      case 'typescript': return <Type className="w-3 h-3" />;
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

  // Configure TypeScript and JSX support
  useEffect(() => {
    const configureMonaco = async () => {
      try {
        // @ts-ignore - Monaco is available via the monaco-editor package
        const monaco = (window as any).monaco;
      
      // TypeScript compiler options
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        jsxFactory: 'React.createElement',
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ["node_modules/@types"]
      });

      // Add React types
      const reactTypes = `
declare module 'react' {
  export interface Component<P = {}, S = {}, SS = any> {}
  export class Component<P, S> {
    constructor(props: P);
    render(): ReactNode;
  }
  export function useState<T>(initial: T): [T, (value: T) => void];
  export function useEffect(effect: () => void, deps?: any[]): void;
  export function useCallback<T extends Function>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export type ReactNode = any;
  export type FC<P = {}> = (props: P) => ReactNode;
}`;

      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        reactTypes,
        'node_modules/@types/react/index.d.ts'
      );

      // Tailwind CSS IntelliSense
      const tailwindClasses = `
declare const className: string;
declare const tw: (strings: TemplateStringsArray, ...values: any[]) => string;
`;

      if (monaco?.languages?.typescript) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          tailwindClasses,
          'tailwind.d.ts'
        );
      }
      } catch (error) {
        console.log('Monaco configuration skipped:', error);
      }
    };

    configureMonaco();
  }, []);

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/90 border-border/60 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-glow rounded-md flex items-center justify-center">
              {getTabIcon(activeTab)}
            </div>
            <h3 className="font-semibold text-sm">React Editor</h3>
            <Badge variant="outline" className="text-xs">
              {activeTab === 'tsx' ? 'TSX' : activeTab.toUpperCase()}
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
            <TabsTrigger value="tsx" className="text-xs flex items-center gap-1">
              <FileCode2 className="w-3 h-3" />
              App.tsx
            </TabsTrigger>
            <TabsTrigger value="css" className="text-xs flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Styles.css
            </TabsTrigger>
            <TabsTrigger value="typescript" className="text-xs flex items-center gap-1">
              <Type className="w-3 h-3" />
              Utils.ts
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 p-4 pt-2">
          <TabsContent value="tsx" className="h-full m-0">
            <div className="h-full border border-border/60 rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm">
              <Editor
                height="100%"
                language="typescript"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={tsxContent}
                onChange={(value) => onCodeChange(value || '', 'tsx')}
                options={editorOptions}
                path="App.tsx"
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
                path="styles.css"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="typescript" className="h-full m-0">
            <div className="h-full border border-border/60 rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm">
              <Editor
                height="100%"
                language="typescript"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={tsContent}
                onChange={(value) => onCodeChange(value || '', 'typescript')}
                options={editorOptions}
                path="utils.ts"
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {getLanguage() === 'typescript' && activeTab === 'tsx' ? 'TSX' : getLanguage().toUpperCase()}
          </span>
          <span>{getLineCount()} lignes</span>
          <span>{getCharCount()} caractères</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs h-5">
            TypeScript
          </Badge>
          <Badge variant="outline" className="text-xs h-5">
            React
          </Badge>
        </div>
      </div>
    </Card>
  );
};