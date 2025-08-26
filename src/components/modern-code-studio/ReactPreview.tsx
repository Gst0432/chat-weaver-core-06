import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RefreshCw, 
  ExternalLink,
  Eye,
  Code,
  AlertCircle,
  CheckCircle,
  Zap,
  Maximize2,
  Minimize2,
  Play
} from "lucide-react";

interface ReactPreviewProps {
  tsxContent: string;
  cssContent: string;
  tsContent: string;
  showPreviewOnly: boolean;
  onTogglePreview: (show: boolean) => void;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

export const ReactPreview = ({ 
  tsxContent, 
  cssContent, 
  tsContent, 
  showPreviewOnly, 
  onTogglePreview 
}: ReactPreviewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const getViewportSize = () => {
    switch (viewMode) {
      case 'desktop': return { width: '100%', height: '100%' };
      case 'tablet': return { width: '768px', height: '1024px' };
      case 'mobile': return { width: '375px', height: '667px' };
      default: return { width: '100%', height: '100%' };
    }
  };

  const compileReactToJs = (tsxCode: string, utilsCode: string): string => {
    try {
      // Simple JSX compilation - convert TSX to regular JS
      let compiled = tsxCode
        // Remove imports except React
        .replace(/import\s+.*?from\s+['"][^'"]*['"];?\n?/g, (match) => {
          if (match.includes('react')) return match;
          return '';
        })
        // Convert interface/type declarations to comments
        .replace(/(?:export\s+)?(?:interface|type)\s+\w+.*?[;}]/gs, '')
        // Convert function component syntax
        .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
        // Ensure React is available
        .replace(/^/, 'const React = window.React;\nconst { useState, useEffect, useCallback, useMemo } = React;\n\n');

      // Add utility functions
      if (utilsCode) {
        const cleanUtils = utilsCode
          .replace(/export\s+/g, '')
          .replace(/(?:interface|type)\s+\w+.*?[;}]/gs, '');
        compiled = cleanUtils + '\n\n' + compiled;
      }

      return compiled;
    } catch (error) {
      console.error('Compilation error:', error);
      return tsxCode;
    }
  };

  const generatePreviewContent = () => {
    const compiledJs = compileReactToJs(tsxContent, tsContent);
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview - Lovable Studio</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              primary: 'hsl(var(--primary))',
              secondary: 'hsl(var(--secondary))',
              accent: 'hsl(var(--accent))',
              background: 'hsl(var(--background))',
              foreground: 'hsl(var(--foreground))',
              muted: 'hsl(var(--muted))',
              border: 'hsl(var(--border))',
            }
          }
        }
      }
    </script>
    
    <!-- React CDN -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    
    <style>
      :root {
        --primary: 217 91% 60%;
        --secondary: 214 32% 91%;
        --accent: 210 40% 98%;
        --background: 0 0% 100%;
        --foreground: 222.2 84% 4.9%;
        --muted: 210 40% 96%;
        --border: 214.3 31.8% 91.4%;
      }
      
      .dark {
        --primary: 217 91% 60%;
        --secondary: 217 32% 17%;
        --accent: 216 28% 7%;
        --background: 224 71% 4%;
        --foreground: 213 31% 91%;
        --muted: 223 47% 11%;
        --border: 216 28% 17%;
      }
      
      ${cssContent}
      
      /* Auto-refresh indicator */
      #auto-refresh-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(34, 197, 94, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      #auto-refresh-indicator.show {
        opacity: 1;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: Inter, system-ui, sans-serif;
      }
    </style>
</head>
<body>
    <div id="auto-refresh-indicator">Actualisé</div>
    <div id="root"></div>
    
    <script>
      // Console override pour capturer les logs
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      window.consoleMessages = [];
      window.errors = [];
      
      console.log = (...args) => {
        originalLog(...args);
        window.consoleMessages.push('LOG: ' + args.join(' '));
        window.parent.postMessage({ type: 'console', message: args.join(' '), level: 'log' }, '*');
      };
      
      console.error = (...args) => {
        originalError(...args);
        window.errors.push('ERROR: ' + args.join(' '));
        window.parent.postMessage({ type: 'console', message: args.join(' '), level: 'error' }, '*');
      };
      
      console.warn = (...args) => {
        originalWarn(...args);
        window.parent.postMessage({ type: 'console', message: args.join(' '), level: 'warn' }, '*');
      };
      
      // Error handler global
      window.addEventListener('error', (e) => {
        const errorMsg = e.message + ' at line ' + e.lineno;
        window.errors.push(errorMsg);
        window.parent.postMessage({ type: 'console', message: errorMsg, level: 'error' }, '*');
      });
      
      // Show refresh indicator
      function showRefreshIndicator() {
        const indicator = document.getElementById('auto-refresh-indicator');
        if (indicator) {
          indicator.classList.add('show');
          setTimeout(() => indicator.classList.remove('show'), 1000);
        }
      }
      
      // Show indicator on load
      showRefreshIndicator();
      
      try {
        // Compiled React code
        ${compiledJs}
        
        // Find the main component (assumes it's the default export)
        const componentName = '${tsxContent.match(/function\s+(\w+)/)?.[1] || 'App'}';
        const Component = window[componentName] || App;
        
        // Render the component
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component));
        
      } catch (error) {
        console.error('React Error:', error);
        document.getElementById('root').innerHTML = \`
          <div style="padding: 20px; color: red; font-family: monospace;">
            <h3>Erreur de compilation React:</h3>
            <pre>\${error.message}</pre>
          </div>
        \`;
      }
    </script>
</body>
</html>`;
  };

  const refreshPreview = () => {
    if (iframeRef.current) {
      const content = generatePreviewContent();
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      setLastUpdate(Date.now());
    }
  };

  // Auto-refresh when content changes
  useEffect(() => {
    if (isAutoRefresh) {
      const timeoutId = setTimeout(refreshPreview, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [tsxContent, cssContent, tsContent, isAutoRefresh]);

  // Message listener for console outputs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console') {
        const { message, level } = event.data;
        
        if (level === 'error') {
          setErrors(prev => [...prev.slice(-9), message]);
        } else {
          setConsoleMessages(prev => [...prev.slice(-19), `${level.toUpperCase()}: ${message}`]);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const openInNewTab = () => {
    const content = generatePreviewContent();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const viewport = getViewportSize();

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-card to-card/80 border-border/60">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-glow rounded-md flex items-center justify-center">
              <Play className="w-3 h-3 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-sm">React Preview</h3>
            <Badge variant={isAutoRefresh ? "default" : "outline"} className="text-xs">
              {isAutoRefresh ? 'Live' : 'Manuel'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePreview(!showPreviewOnly)}
              className="h-7 px-2"
              title={showPreviewOnly ? "Afficher l'éditeur" : "Masquer l'éditeur"}
            >
              {showPreviewOnly ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className="h-7 px-2"
            >
              <Zap className={`w-3 h-3 ${isAutoRefresh ? 'text-green-500' : 'text-muted-foreground'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPreview}
              className="h-7 px-2"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openInNewTab}
              className="h-7 px-2"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Viewport Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('desktop')}
            className="h-7 px-2"
          >
            <Monitor className="w-3 h-3" />
          </Button>
          <Button
            variant={viewMode === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('tablet')}
            className="h-7 px-2"
          >
            <Tablet className="w-3 h-3" />
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('mobile')}
            className="h-7 px-2"
          >
            <Smartphone className="w-3 h-3" />
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {viewport.width} × {viewport.height}
          </div>
        </div>
      </div>

      <Tabs defaultValue="preview" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
          <TabsTrigger value="preview" className="text-xs">
            <Eye className="w-3 h-3 mr-1" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="console" className="text-xs relative">
            <Code className="w-3 h-3 mr-1" />
            Console
            {consoleMessages.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                {consoleMessages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="errors" className="text-xs relative">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erreurs
            {errors.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                {errors.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 m-0">
          <div className="h-full p-4">
            <div 
              className="h-full border border-border/60 rounded-lg overflow-hidden bg-white shadow-lg"
              style={{
                maxWidth: viewMode === 'desktop' ? '100%' : viewport.width,
                maxHeight: viewMode === 'desktop' ? '100%' : viewport.height,
                margin: viewMode === 'desktop' ? '0' : '0 auto',
                transform: viewMode !== 'desktop' ? 'scale(0.8)' : 'none',
                transformOrigin: 'top center'
              }}
            >
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="React Preview"
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => refreshPreview()}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="console" className="flex-1 m-4 mt-2">
          <Card className="h-full p-3 bg-black/95 text-green-400 font-mono text-xs overflow-auto">
            {consoleMessages.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                Console vide - aucun message
              </div>
            ) : (
              <div className="space-y-1">
                {consoleMessages.map((msg, index) => (
                  <div key={index} className="text-green-400">
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="flex-1 m-4 mt-2">
          <Card className="h-full p-3 bg-red-950/20 border-red-500/30 overflow-auto">
            {errors.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                Aucune erreur détectée
              </div>
            ) : (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="text-red-600 text-xs font-mono p-2 bg-red-100/10 rounded border-l-2 border-red-500">
                    {error}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </Card>
  );
};