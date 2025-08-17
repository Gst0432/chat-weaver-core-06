import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Copy, 
  File, 
  FileCode2, 
  Database, 
  Download, 
  Play, 
  Square, 
  Share2, 
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Terminal
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface FileStructure {
  [key: string]: {
    content: string;
    language: string;
    icon: React.ReactNode;
    type: 'file' | 'folder';
    children?: FileStructure;
  };
}

interface AdvancedCodeEditorProps {
  initialFiles?: FileStructure;
  onFilesChange?: (files: FileStructure) => void;
  onRun?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
  terminalOutput?: string;
}

export const AdvancedCodeEditor = ({ 
  initialFiles = {},
  onFilesChange,
  onRun,
  onStop,
  isRunning = false,
  terminalOutput = ""
}: AdvancedCodeEditorProps) => {
  const [files, setFiles] = useState<FileStructure>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [newFileName, setNewFileName] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);

  // Default file structure
  useEffect(() => {
    if (Object.keys(files).length === 0) {
      const defaultFiles: FileStructure = {
        "package.json": {
          content: `{
  "name": "generated-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}`,
          language: "json",
          icon: <FileCode2 className="w-4 h-4 text-orange-500" />,
          type: 'file'
        },
        "index.html": {
          content: `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Générée</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
          language: "html",
          icon: <File className="w-4 h-4 text-orange-500" />,
          type: 'file'
        },
        "src": {
          content: "",
          language: "text",
          icon: <FolderOpen className="w-4 h-4 text-blue-500" />,
          type: 'folder',
          children: {
            "main.jsx": {
              content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
              language: "javascript",
              icon: <FileCode2 className="w-4 h-4 text-yellow-500" />,
              type: 'file'
            },
            "App.jsx": {
              content: `function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          🚀 Application Générée par IA
        </h1>
        <div className="bg-white rounded-lg shadow-xl p-6">
          <p className="text-gray-600">
            Votre application est prête ! Vous pouvez maintenant la modifier et l'améliorer.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App`,
              language: "javascript",
              icon: <FileCode2 className="w-4 h-4 text-blue-500" />,
              type: 'file'
            }
          }
        }
      };
      setFiles(defaultFiles);
      setSelectedFile("src/App.jsx");
    }
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const getAllFiles = (fileStructure: FileStructure, path = ""): Array<{path: string, file: any}> => {
    let allFiles: Array<{path: string, file: any}> = [];
    
    Object.entries(fileStructure).forEach(([name, file]) => {
      const currentPath = path ? `${path}/${name}` : name;
      
      if (file.type === 'file') {
        allFiles.push({ path: currentPath, file });
      } else if (file.children) {
        allFiles = [...allFiles, ...getAllFiles(file.children, currentPath)];
      }
    });
    
    return allFiles;
  };

  const getFileAtPath = (path: string): any => {
    const parts = path.split('/');
    let current: any = files;
    
    for (const part of parts) {
      if (current[part]) {
        if (current[part].type === 'folder' && current[part].children) {
          current = current[part].children;
        } else {
          return current[part];
        }
      }
    }
    return null;
  };

  const updateFileContent = (path: string, content: string) => {
    const newFiles = { ...files };
    const parts = path.split('/');
    let current = newFiles;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] && current[parts[i]].children) {
        current = current[parts[i]].children!;
      }
    }
    
    if (current[parts[parts.length - 1]]) {
      current[parts[parts.length - 1]].content = content;
      setFiles(newFiles);
      onFilesChange?.(newFiles);
    }
  };

  const currentFile = getFileAtPath(selectedFile);
  const allFiles = getAllFiles(files);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code copié",
        description: "Le code a été copié dans le presse-papiers."
      });
    } catch (e) {
      toast({
        title: "Échec de copie",
        description: "Impossible de copier le code.",
        variant: "destructive"
      });
    }
  };

  const saveFile = () => {
    if (currentFile && editorRef.current) {
      const content = editorRef.current.getValue();
      updateFileContent(selectedFile, content);
      toast({
        title: "Fichier sauvegardé",
        description: `${selectedFile} a été sauvegardé.`
      });
    }
  };

  const renderFileTree = (fileStructure: FileStructure, path = "", depth = 0) => {
    return Object.entries(fileStructure).map(([name, file]) => {
      const currentPath = path ? `${path}/${name}` : name;
      const isSelected = selectedFile === currentPath;
      
      return (
        <div key={currentPath}>
          <div
            onClick={() => file.type === 'file' && setSelectedFile(currentPath)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-smooth cursor-pointer ${
              isSelected 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
            style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
          >
            <span className="flex-shrink-0">{file.icon}</span>
            <span className="flex-1 truncate font-mono text-xs">{name}</span>
            {file.type === 'file' && (
              <span className="text-xs px-1 py-0.5 bg-muted rounded opacity-60">
                {file.language.toUpperCase()}
              </span>
            )}
          </div>
          {file.type === 'folder' && file.children && (
            <div className="ml-2">
              {renderFileTree(file.children, currentPath, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <Card className="h-[700px] overflow-hidden shadow-elegant">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* File Explorer */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full border-r border-border bg-card">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">📁 Explorateur</h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-4rem)] p-2">
              {renderFileTree(files)}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor */}
        <ResizablePanel defaultSize={75}>
          <ResizablePanelGroup direction="vertical">
            {/* Code Editor */}
            <ResizablePanel defaultSize={showTerminal ? 70 : 100}>
              <div className="h-full flex flex-col bg-background">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                  <div className="flex items-center gap-3">
                    {currentFile && (
                      <>
                        <span className="flex-shrink-0">{currentFile.icon}</span>
                        <span className="font-medium text-foreground font-mono text-sm">{selectedFile}</span>
                        <Badge variant="outline" className="text-xs">
                          {currentFile.language.toUpperCase()}
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={saveFile}
                      disabled={!currentFile}
                      className="h-8 px-3"
                    >
                      <Save className="w-3 h-3 mr-2" />
                      Sauver
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => currentFile && copyCode(currentFile.content)}
                      disabled={!currentFile}
                      className="h-8 px-3"
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copier
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      size="sm"
                      variant={isRunning ? "destructive" : "default"}
                      onClick={isRunning ? onStop : onRun}
                      className="h-8 px-3"
                    >
                      {isRunning ? (
                        <>
                          <Square className="w-3 h-3 mr-2" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-2" />
                          Lancer
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTerminal(!showTerminal)}
                      className="h-8 px-3"
                    >
                      <Terminal className="w-3 h-3 mr-2" />
                      Terminal
                    </Button>
                  </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-hidden">
                  {currentFile ? (
                    <Editor
                      height="100%"
                      language={currentFile.language}
                      value={currentFile.content}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      onMount={handleEditorDidMount}
                      onChange={(value) => value && updateFileContent(selectedFile, value)}
                      options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineHeight: 1.6,
                        padding: { top: 16, bottom: 16 },
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        renderWhitespace: 'selection',
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <FileCode2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Sélectionnez un fichier pour commencer l'édition</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            {/* Terminal */}
            {showTerminal && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={20}>
                  <div className="h-full bg-black text-green-400 font-mono text-sm">
                    <div className="p-2 border-b border-gray-700 bg-gray-900 text-white">
                      <span>Terminal</span>
                    </div>
                    <ScrollArea className="h-[calc(100%-2.5rem)] p-4">
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                        {terminalOutput || "En attente d'exécution..."}
                      </pre>
                    </ScrollArea>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
};