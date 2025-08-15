import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Copy, File, FileCode2, Database, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "next-themes";

interface CodeEditorProps {
  html?: string;
  css?: string;
  javascript?: string;
  database?: string;
  onDownload?: () => void;
}

interface FileData {
  name: string;
  content: string;
  language: string;
  icon: React.ReactNode;
  extension: string;
}

export const CodeEditor = ({ html, css, javascript, database = "", onDownload }: CodeEditorProps) => {
  const [selectedFile, setSelectedFile] = useState<string>("index.html");
  const { theme } = useTheme();

  const files: FileData[] = [
    {
      name: "index.html",
      content: (html && typeof html === 'string') ? html : "<!-- HTML content will appear here -->",
      language: "html",
      icon: <File className="w-4 h-4 text-orange-500" />,
      extension: "html"
    },
    {
      name: "styles.css",
      content: (css && typeof css === 'string') ? css : "/* CSS styles will appear here */",
      language: "css",
      icon: <FileCode2 className="w-4 h-4 text-blue-500" />,
      extension: "css"
    },
    {
      name: "script.js",
      content: (javascript && typeof javascript === 'string') ? javascript : "// JavaScript code will appear here",
      language: "javascript",
      icon: <FileCode2 className="w-4 h-4 text-yellow-500" />,
      extension: "js"
    }
  ];

  if (database && typeof database === 'string' && database.trim()) {
    files.push({
      name: "database.sql",
      content: database,
      language: "sql",
      icon: <Database className="w-4 h-4 text-green-500" />,
      extension: "sql"
    });
  }

  const currentFile = files.find(f => f.name === selectedFile) || files[0];

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

  return (
    <Card className="h-[600px] overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* File Explorer */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full border-r bg-muted/30">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="text-sm font-medium text-foreground">Fichiers</h3>
            </div>
            <div className="p-2 space-y-1">
              {files.map((file) => (
                <div
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-sm transition-colors hover:bg-accent/50 ${
                    selectedFile === file.name 
                      ? 'bg-accent text-accent-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {file.icon}
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Code Editor */}
        <ResizablePanel defaultSize={75}>
          <div className="h-full flex flex-col">
            {/* Editor Header */}
            <div className="flex items-center justify-between p-3 border-b bg-secondary/30">
              <div className="flex items-center gap-2">
                {currentFile.icon}
                <span className="text-sm font-medium">{currentFile.name}</span>
                <Badge variant="outline" className="text-xs">
                  {currentFile.extension.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyCode(currentFile.content)}
                  className="h-7 px-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copier
                </Button>
                {onDownload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDownload}
                    className="h-7 px-2"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Télécharger
                  </Button>
                )}
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden">
              <SyntaxHighlighter
                language={currentFile.language}
                style={theme === 'dark' ? vscDarkPlus : oneLight}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  height: '100%',
                  overflow: 'auto'
                }}
                showLineNumbers={true}
                wrapLines={true}
                wrapLongLines={true}
              >
                {currentFile.content}
              </SyntaxHighlighter>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
};