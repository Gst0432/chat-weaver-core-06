import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "next-themes";

interface CodePreviewProps {
  content: string;
  isUser?: boolean;
}

interface CodeBlock {
  type: 'code' | 'text';
  content: string;
  language?: string;
  isInline?: boolean;
}

const parseContent = (content: string): CodeBlock[] => {
  const parts: CodeBlock[] = [];
  
  // Regex pour détecter les blocs de code avec ```language
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  // Regex pour détecter le code inline avec `code`
  const inlineCodeRegex = /`([^`]+)`/g;
  
  let lastIndex = 0;
  let match;
  
  // Traiter les blocs de code
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Ajouter le texte avant le bloc de code
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Ajouter le bloc de code
    parts.push({
      type: 'code',
      content: match[2] || match[1] || '',
      language: match[1] || 'text',
      isInline: false
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Ajouter le texte restant
  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex);
    if (remaining.trim()) {
      parts.push({ type: 'text', content: remaining });
    }
  }
  
  // Si aucun bloc de code n'a été trouvé, traiter le code inline
  if (parts.length === 0 || parts.every(p => p.type === 'text')) {
    const processInlineCode = (text: string): CodeBlock[] => {
      const result: CodeBlock[] = [];
      let lastIdx = 0;
      let inlineMatch;
      
      while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
        // Texte avant le code inline
        if (inlineMatch.index > lastIdx) {
          const textPart = text.substring(lastIdx, inlineMatch.index);
          if (textPart) {
            result.push({ type: 'text', content: textPart });
          }
        }
        
        // Code inline
        result.push({
          type: 'code',
          content: inlineMatch[1],
          language: 'text',
          isInline: true
        });
        
        lastIdx = inlineMatch.index + inlineMatch[0].length;
      }
      
      // Texte restant
      if (lastIdx < text.length) {
        const remaining = text.substring(lastIdx);
        if (remaining) {
          result.push({ type: 'text', content: remaining });
        }
      }
      
      return result.length > 0 ? result : [{ type: 'text', content: text }];
    };
    
    // Appliquer le traitement inline à tout le contenu
    return processInlineCode(content);
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content }];
};

const getLanguageDisplayName = (lang: string) => {
  const langMap: Record<string, string> = {
    'js': 'JavaScript', 'javascript': 'JavaScript',
    'ts': 'TypeScript', 'typescript': 'TypeScript',
    'tsx': 'TypeScript JSX', 'jsx': 'JavaScript JSX',
    'py': 'Python', 'python': 'Python',
    'java': 'Java', 'c': 'C', 'cpp': 'C++', 'cs': 'C#',
    'php': 'PHP', 'rb': 'Ruby', 'ruby': 'Ruby',
    'go': 'Go', 'rust': 'Rust', 'swift': 'Swift',
    'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS',
    'json': 'JSON', 'xml': 'XML', 'yaml': 'YAML',
    'sql': 'SQL', 'bash': 'Bash', 'shell': 'Shell',
    'dockerfile': 'Dockerfile', 'docker': 'Docker'
  };
  return langMap[lang.toLowerCase()] || lang.toUpperCase();
};

export const CodePreview = ({ content, isUser = false }: CodePreviewProps) => {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const { theme } = useTheme();
  
  const parts = parseContent(content);
  const hasCode = parts.some(part => part.type === 'code');
  
  if (!hasCode) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    );
  }
  
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedBlocks(newExpanded);
  };
  
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ 
        title: "Copié", 
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
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
              {part.content}
            </div>
          );
        }
        
        // Code block
        const isExpanded = expandedBlocks.has(index);
        const shouldTruncate = !part.isInline && part.content.split('\n').length > 10;
        const displayContent = shouldTruncate && !isExpanded 
          ? part.content.split('\n').slice(0, 8).join('\n') + '\n...'
          : part.content;
        
        if (part.isInline) {
          return (
            <code 
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary/50 text-foreground rounded border font-mono"
            >
              <Code2 className="w-3 h-3" />
              {part.content}
            </code>
          );
        }
        
        return (
          <Card key={index} className="overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-secondary/30 border-b">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                <Badge variant="outline" className="text-xs">
                  {getLanguageDisplayName(part.language || 'text')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyCode(part.content)}
                  className="h-7 px-2"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                {shouldTruncate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpanded(index)}
                    className="h-7 px-2"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <SyntaxHighlighter
                language={part.language || 'text'}
                style={theme === 'dark' ? vscDarkPlus : oneLight}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}
                wrapLines={true}
                wrapLongLines={true}
              >
                {displayContent}
              </SyntaxHighlighter>
            </div>
          </Card>
        );
      })}
    </div>
  );
};