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
  Zap
} from "lucide-react";

interface AdvancedPreviewProps {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

export const AdvancedPreview = ({ htmlContent, cssContent, jsContent }: AdvancedPreviewProps) => {
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

  const generatePreviewContent = () => {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview - Code Studio</title>
    <style>
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
    </style>
</head>
<body>
    <div id="auto-refresh-indicator">Actualisé</div>
    ${htmlContent.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
    
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
        ${jsContent}
      } catch (error) {
        console.error('JavaScript Error:', error);
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
      const timeoutId = setTimeout(refreshPreview, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [htmlContent, cssContent, jsContent, isAutoRefresh]);

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
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-accent/5 to-accent/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm">Prévisualisation</h3>
            <Badge variant={isAutoRefresh ? "default" : "outline"} className="text-xs">
              {isAutoRefresh ? 'Auto' : 'Manuel'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
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
                title="Preview"
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