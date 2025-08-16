import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Tablet, Maximize, ExternalLink, RotateCcw, Code2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WebPreviewProps {
  content: string | {
    html?: string;
    css?: string;
    javascript?: string;
    databaseSchema?: string;
  };
}

interface WebContent {
  html: string;
  css: string;
  js: string;
  isWebContent: boolean;
}

const detectWebContent = (content: string | { html?: string; css?: string; javascript?: string; databaseSchema?: string }): WebContent => {
  // Si c'est un objet GeneratedApp
  if (typeof content === 'object' && content !== null) {
    return {
      html: content.html || '',
      css: content.css || '',
      js: content.javascript || '',
      isWebContent: !!(content.html || content.css || content.javascript)
    };
  }
  
  // Si c'est une string, détecter les blocs de code HTML, CSS, JS
  const contentStr = String(content || '');
  const htmlMatch = contentStr.match(/```html\s*\n?([\s\S]*?)```/i) || contentStr.match(/```\s*\n?([\s\S]*?<html[\s\S]*?<\/html>[\s\S]*?)```/i);
  const cssMatch = contentStr.match(/```css\s*\n?([\s\S]*?)```/i);
  const jsMatch = contentStr.match(/```(?:javascript|js)\s*\n?([\s\S]*?)```/i);
  
  let html = htmlMatch ? htmlMatch[1].trim() : '';
  let css = cssMatch ? cssMatch[1].trim() : '';
  let js = jsMatch ? jsMatch[1].trim() : '';
  
  // Si pas de HTML explicite mais qu'on a des éléments HTML dans le contenu (pour les strings seulement)
  if (!html && typeof content === 'string' && (contentStr.includes('<html>') || contentStr.includes('<!DOCTYPE') || contentStr.includes('<div') || contentStr.includes('<button') || contentStr.includes('<p>'))) {
    // Extraire le HTML du contenu
    const htmlContent = contentStr.match(/<(?:html|!DOCTYPE|div|button|p|span|h[1-6]|ul|ol|li|img|a|form|input|textarea|select|table|tr|td|th|head|body|script|style)[^>]*>[\s\S]*?<\/(?:html|div|button|p|span|h[1-6]|ul|ol|li|a|form|textarea|select|table|tr|td|th|head|body|script|style)>|<(?:!DOCTYPE|br|hr|img|input|meta|link)[^>]*\/?>/gi);
    if (htmlContent) {
      html = htmlContent.join('\n');
    }
  }
  
  // Si HTML contient du CSS inline, l'extraire
  if (html && !css) {
    const inlineCssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (inlineCssMatch) {
      css = inlineCssMatch[1].trim();
    }
  }
  
  // Si HTML contient du JS inline, l'extraire
  if (html && !js) {
    const inlineJsMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (inlineJsMatch) {
      js = inlineJsMatch[1].trim();
    }
  }
  
  const isWebContent = !!(html || (css && js));
  
  return { html, css, js, isWebContent };
};

const generateFullHTML = (webContent: WebContent): string => {
  const { html, css, js } = webContent;
  
  // Si on a déjà un document HTML complet
  if (html.includes('<!DOCTYPE') || html.includes('<html>')) {
    return html;
  }
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aperçu Web</title>
    ${css ? `<style>${css}</style>` : ''}
</head>
<body>
    ${html || '<p>Contenu généré par IA</p>'}
    ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
};

export const WebPreview = ({ content }: WebPreviewProps) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const webContent = useMemo(() => detectWebContent(content), [content]);
  
  if (!webContent.isWebContent) {
    return null;
  }
  
  const fullHTML = generateFullHTML(webContent);
  
  const getFrameSize = () => {
    switch (viewMode) {
      case 'mobile': return 'w-[375px] h-[667px]';
      case 'tablet': return 'w-[768px] h-[1024px]';
      default: return 'w-full h-[600px]';
    }
  };
  
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  const openInNewTab = () => {
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  
  const exportToCodePen = () => {
    const form = document.createElement('form');
    form.action = 'https://codepen.io/pen/define';
    form.method = 'POST';
    form.target = '_blank';
    
    const data = {
      title: 'Code généré par IA',
      html: webContent.html,
      css: webContent.css,
      js: webContent.js
    };
    
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(data);
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    toast({
      title: "Export réussi",
      description: "Le code a été exporté vers CodePen",
    });
  };
  
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Monitor className="w-3 h-3 mr-1" />
              Aperçu Web
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              className="h-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openInNewTab}
              className="h-8"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(false)}
              className="h-8"
            >
              <Code2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <iframe
          key={refreshKey}
          srcDoc={fullHTML}
          className="w-full h-[calc(100vh-73px)] border-none"
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="lazy"
        />
      </div>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-secondary/30 border-b">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          <Badge variant="outline" className="text-xs">
            Aperçu Web
          </Badge>
          {webContent.html && (
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
              HTML
            </Badge>
          )}
          {webContent.css && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
              CSS
            </Badge>
          )}
          {webContent.js && (
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              JS
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('desktop')}
            className="h-7 px-2"
          >
            <Monitor className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'tablet' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('tablet')}
            className="h-7 px-2"
          >
            <Tablet className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('mobile')}
            className="h-7 px-2"
          >
            <Smartphone className="w-3 h-3" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            className="h-7 px-2"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(true)}
            className="h-7 px-2"
          >
            <Maximize className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={openInNewTab}
            className="h-7 px-2"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="p-4 bg-muted/20">
        <div className="flex justify-center">
          <div className={`${getFrameSize()} max-w-full bg-white rounded-md border shadow-sm overflow-hidden`}>
            <iframe
              key={refreshKey}
              srcDoc={fullHTML}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 p-3 border-t bg-secondary/20">
        <Button
          size="sm"
          variant="outline"
          onClick={exportToCodePen}
          className="h-8"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          CodePen
        </Button>
      </div>
    </Card>
  );
};