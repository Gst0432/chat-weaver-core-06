import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder,
  FolderOpen,
  FileCode2,
  Palette,
  Type,
  Settings,
  Package,
  FileText,
  Image,
  Database,
  ChevronRight,
  ChevronDown,
  Plus,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface ReactFileExplorerProps {
  activeFile: string;
  onSelectFile: (fileId: string, fileName: string, content: string) => void;
  onCreateFile: (path: string, type: 'file' | 'folder') => void;
}

const getFileIcon = (fileName: string, extension?: string) => {
  if (extension === '.tsx' || extension === '.jsx') return <FileCode2 className="w-3 h-3 text-blue-500" />;
  if (extension === '.css' || extension === '.scss') return <Palette className="w-3 h-3 text-pink-500" />;
  if (extension === '.ts' || extension === '.js') return <Type className="w-3 h-3 text-yellow-500" />;
  if (extension === '.json') return <Settings className="w-3 h-3 text-green-500" />;
  if (extension === '.md') return <FileText className="w-3 h-3 text-gray-500" />;
  if (extension === '.png' || extension === '.jpg' || extension === '.svg') return <Image className="w-3 h-3 text-purple-500" />;
  return <FileText className="w-3 h-3 text-gray-400" />;
};

const defaultReactStructure: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src/components',
        name: 'components',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'src/components/App.tsx',
            name: 'App.tsx',
            type: 'file',
            extension: '.tsx',
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          Bienvenue dans votre App React
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Composants</h2>
            <p className="text-gray-600">Créez des composants réutilisables</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">État</h2>
            <p className="text-gray-600">Gérez l'état avec React Hooks</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Design</h2>
            <p className="text-gray-600">Stylisez avec Tailwind CSS</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;`
          },
          {
            id: 'src/components/Header.tsx',
            name: 'Header.tsx',
            type: 'file',
            extension: '.tsx',
            content: `import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-gray-600 mt-2">{subtitle}</p>
        )}
      </div>
    </header>
  );
};`
          },
          {
            id: 'src/components/Button.tsx',
            name: 'Button.tsx',
            type: 'file',
            extension: '.tsx',
            content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${disabled ? 'opacity-50 cursor-not-allowed' : ''}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};`
          }
        ]
      },
      {
        id: 'src/hooks',
        name: 'hooks',
        type: 'folder',
        children: [
          {
            id: 'src/hooks/useCounter.tsx',
            name: 'useCounter.tsx',
            type: 'file',
            extension: '.tsx',
            content: `import { useState } from 'react';

export const useCounter = (initialValue: number = 0) => {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
};`
          }
        ]
      },
      {
        id: 'src/utils',
        name: 'utils',
        type: 'folder',
        children: [
          {
            id: 'src/utils/helpers.ts',
            name: 'helpers.ts',
            type: 'file',
            extension: '.ts',
            content: `// Utilitaires TypeScript
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR').format(date);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};`
          },
          {
            id: 'src/utils/types.ts',
            name: 'types.ts',
            type: 'file',
            extension: '.ts',
            content: `// Types et interfaces globales
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export type Theme = 'light' | 'dark' | 'system';

export interface AppConfig {
  theme: Theme;
  language: string;
  notifications: boolean;
}`
          }
        ]
      },
      {
        id: 'src/styles',
        name: 'styles',
        type: 'folder',
        children: [
          {
            id: 'src/styles/globals.css',
            name: 'globals.css',
            type: 'file',
            extension: '.css',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Variables CSS personnalisées */
:root {
  --primary: #3b82f6;
  --primary-dark: #1d4ed8;
  --secondary: #6b7280;
  --accent: #f59e0b;
  --background: #ffffff;
  --foreground: #1f2937;
}

/* Styles de base */
* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  color: var(--foreground);
  background-color: var(--background);
}

/* Composants personnalisés */
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors;
}

.card {
  @apply bg-white rounded-lg shadow-lg p-6 border border-gray-200;
}

.input {
  @apply border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

/* Animations */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}`
          }
        ]
      }
    ]
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    children: [
      {
        id: 'public/index.html',
        name: 'index.html',
        type: 'file',
        extension: '.html',
        content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'package.json',
    name: 'package.json',
    type: 'file',
    extension: '.json',
    content: `{
  "name": "react-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^4.9.5"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}`
  }
];

export const ReactFileExplorer = ({ activeFile, onSelectFile, onCreateFile }: ReactFileExplorerProps) => {
  const [fileStructure, setFileStructure] = useState<FileNode[]>(defaultReactStructure);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleFolder = (nodeId: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setFileStructure(updateNode(fileStructure));
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isActive = activeFile === node.id;
    const indentClass = `ml-${depth * 4}`;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 text-sm hover:bg-muted/50 cursor-pointer rounded-sm ${
            isActive ? 'bg-primary/10 text-primary font-medium' : ''
          } ${indentClass}`}
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.id);
            } else {
              onSelectFile(node.id, node.name, node.content || '');
            }
          }}
        >
          {isFolder ? (
            <>
              {node.isOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {node.isOpen ? (
                <FolderOpen className="w-3 h-3 text-blue-500" />
              ) : (
                <Folder className="w-3 h-3 text-blue-500" />
              )}
            </>
          ) : (
            <>
              <div className="w-3 h-3" />
              {getFileIcon(node.name, node.extension)}
            </>
          )}
          <span className="flex-1 truncate">{node.name}</span>
          {!isFolder && node.extension && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {node.extension.slice(1)}
            </Badge>
          )}
        </div>
        
        {isFolder && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredFiles = (nodes: FileNode[]): FileNode[] => {
    if (!searchTerm) return nodes;
    
    return nodes.filter(node => {
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }
      if (node.children) {
        const filteredChildren = filteredFiles(node.children);
        if (filteredChildren.length > 0) {
          return true;
        }
      }
      return false;
    }).map(node => ({
      ...node,
      isOpen: searchTerm ? true : node.isOpen,
      children: node.children ? filteredFiles(node.children) : undefined
    }));
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/90 border-border/60">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-accent/5 to-accent-glow/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-accent to-accent-glow rounded-md flex items-center justify-center">
              <Package className="w-3 h-3 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-sm">Explorateur</h3>
            <Badge variant="outline" className="text-xs">
              React
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateFile('src/', 'file')}
            className="h-6 px-2"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Rechercher des fichiers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-0.5">
          {filteredFiles(fileStructure).map(node => renderFileNode(node))}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-border/60 bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Structure React</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileCode2 className="w-3 h-3" />
              {fileStructure.flatMap(n => n.children?.filter(c => c.extension === '.tsx') || []).length} TSX
            </span>
            <span className="flex items-center gap-1">
              <Palette className="w-3 h-3" />
              {fileStructure.flatMap(n => n.children?.filter(c => c.extension === '.css') || []).length} CSS
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};