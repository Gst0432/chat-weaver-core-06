import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Zap, 
  CheckCircle, 
  Loader2,
  Wrench,
  Code,
  X
} from "lucide-react";
import { StreamingService } from "@/services/streamingService";
import { useToast } from "@/hooks/use-toast";

interface ErrorFixAssistantProps {
  errors: string[];
  code: {
    tsx: string;
    css: string;
    typescript: string;
  };
  onCodeFixed: (fixedCode: { tsx?: string; css?: string; typescript?: string }) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const ErrorFixAssistant = ({ 
  errors, 
  code, 
  onCodeFixed, 
  isVisible, 
  onClose 
}: ErrorFixAssistantProps) => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuggestions, setFixSuggestions] = useState<string[]>([]);
  const [lastFixAttempt, setLastFixAttempt] = useState<string>('');
  const { toast } = useToast();

  const detectErrorType = (error: string): 'syntax' | 'runtime' | 'typescript' | 'css' | 'general' => {
    if (error.includes('SyntaxError') || error.includes('Unexpected token')) return 'syntax';
    if (error.includes('TypeError') || error.includes('ReferenceError')) return 'runtime';
    if (error.includes('Property') && error.includes('does not exist')) return 'typescript';
    if (error.includes('CSS') || error.includes('style')) return 'css';
    return 'general';
  };

  const generateFixPrompt = (errors: string[]) => {
    const errorTypes = errors.map(detectErrorType);
    const hasMultipleTypes = new Set(errorTypes).size > 1;

    return `Tu es un expert en React/TypeScript. Analyse ces erreurs et corrige le code automatiquement :

ERREURS DÉTECTÉES :
${errors.map((error, i) => `${i + 1}. ${error}`).join('\n')}

CODE ACTUEL :
=== App.tsx ===
\`\`\`tsx
${code.tsx}
\`\`\`

=== Styles.css ===
\`\`\`css
${code.css}
\`\`\`

=== Utils.ts ===
\`\`\`typescript
${code.typescript}
\`\`\`

INSTRUCTIONS :
1. Identifie la cause exacte de chaque erreur
2. Applique les corrections nécessaires
3. Assure-toi que le code reste fonctionnel
4. ${hasMultipleTypes ? 'Traite toutes les erreurs en une seule fois' : 'Corrige cette erreur spécifique'}
5. Conserve la logique métier existante

Réponds UNIQUEMENT avec le code corrigé dans ce format :
\`\`\`tsx
// Code TSX corrigé
\`\`\`

\`\`\`css
// Code CSS corrigé
\`\`\`

\`\`\`typescript
// Code TypeScript corrigé
\`\`\``;
  };

  const fixErrors = async () => {
    if (errors.length === 0) {
      toast({
        title: "Aucune erreur",
        description: "Aucune erreur à corriger actuellement",
      });
      return;
    }

    setIsFixing(true);
    setFixSuggestions([]);

    try {
      const prompt = generateFixPrompt(errors);
      setLastFixAttempt(new Date().toLocaleTimeString());

      let response = '';
      await StreamingService.streamWithFallback({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        onChunk: (chunk) => {
          response += chunk;
          // Rechercher les suggestions de correction en temps réel
          const suggestions = response.match(/(?:erreur|problème|correction|fix)[\s\S]*?(?=\n|$)/gi) || [];
          setFixSuggestions(suggestions.slice(0, 3));
        },
        onComplete: () => {
          // Extraire le code corrigé
          const fixedCode = extractCodeBlocks(response);
          if (fixedCode.tsx || fixedCode.css || fixedCode.typescript) {
            onCodeFixed(fixedCode);
            toast({
              title: "✅ Code corrigé",
              description: `${errors.length} erreur(s) traitée(s) automatiquement`,
            });
          } else {
            toast({
              title: "⚠️ Correction partielle",
              description: "L'IA n'a pas pu corriger automatiquement toutes les erreurs",
              variant: "destructive"
            });
          }
        },
        onError: (error) => {
          console.error('Error fixing code:', error);
          toast({
            title: "Erreur",
            description: "Impossible de corriger automatiquement le code",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Error in fix process:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la correction",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const extractCodeBlocks = (response: string) => {
    const blocks: { tsx?: string; css?: string; typescript?: string } = {};
    
    // Extraction TSX
    const tsxMatch = response.match(/```(?:tsx|typescript|jsx)\n([\s\S]*?)\n```/);
    if (tsxMatch) blocks.tsx = tsxMatch[1];
    
    // Extraction CSS
    const cssMatch = response.match(/```css\n([\s\S]*?)\n```/);
    if (cssMatch) blocks.css = cssMatch[1];
    
    // Extraction TypeScript
    const tsMatch = response.match(/```typescript\n([\s\S]*?)\n```/);
    if (tsMatch) blocks.typescript = tsMatch[1];
    
    return blocks;
  };

  const getErrorSeverity = (error: string): 'critical' | 'warning' | 'info' => {
    if (error.includes('SyntaxError') || error.includes('ReferenceError')) return 'critical';
    if (error.includes('Warning') || error.includes('deprecated')) return 'warning';
    return 'info';
  };

  const getPriorityErrors = () => {
    return errors
      .map(error => ({ error, severity: getErrorSeverity(error) }))
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  };

  if (!isVisible || errors.length === 0) return null;

  return (
    <Card className="absolute top-4 right-4 w-96 max-h-96 overflow-hidden z-50 bg-card/95 backdrop-blur-sm border-orange-500/30 shadow-xl">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
            <h3 className="font-semibold text-sm">Assistant de Correction</h3>
            <Badge variant="destructive" className="text-xs">
              {errors.length} erreur{errors.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Liste des erreurs prioritaires */}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {getPriorityErrors().slice(0, 3).map(({ error, severity }, index) => (
              <div key={index} className={`p-2 rounded text-xs border-l-2 ${
                severity === 'critical' ? 'bg-red-50 border-red-500 text-red-700' :
                severity === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
                'bg-blue-50 border-blue-500 text-blue-700'
              }`}>
                <div className="flex items-center gap-1 mb-1">
                  <Badge variant="outline" className="text-xs h-4">
                    {severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵'}
                    {severity}
                  </Badge>
                </div>
                <div className="font-mono">{error.substring(0, 100)}...</div>
              </div>
            ))}
          </div>

          {/* Suggestions en temps réel */}
          {fixSuggestions.length > 0 && (
            <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-500">
              <div className="text-xs font-medium text-blue-700 mb-1">Analyse en cours...</div>
              {fixSuggestions.map((suggestion, index) => (
                <div key={index} className="text-xs text-blue-600 font-mono">
                  • {suggestion.substring(0, 80)}...
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={fixErrors}
              disabled={isFixing}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {isFixing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Correction...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-2" />
                  🤖 Corriger Auto
                </>
              )}
            </Button>
            
            <Badge variant="outline" className="text-xs">
              <Code className="w-3 h-3 mr-1" />
              IA
            </Badge>
          </div>

          {lastFixAttempt && (
            <div className="text-xs text-muted-foreground">
              Dernière tentative: {lastFixAttempt}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};