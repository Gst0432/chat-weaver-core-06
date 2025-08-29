import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Download, 
  Copy, 
  FileText, 
  Maximize2, 
  Minimize2,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Calculator,
  BarChart3,
  Eye,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  FileType2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentContentViewerProps {
  document: {
    id: string;
    original_filename: string;
    file_type: string;
    extracted_text?: string;
    analysis_status?: string;
    ai_summary?: string;
    key_points?: string[];
    document_type?: string;
    is_financial?: boolean;
    structure_info?: any;
  } | null;
  isAnalyzing: boolean;
}

export default function DocumentContentViewer({ document, isAnalyzing }: DocumentContentViewerProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Process and structure the document content
  const processContent = (text: string) => {
    if (!text) return { sections: [], financialData: [], tables: [] };

    const sections: { title: string; content: string; type: 'text' | 'financial' | 'table' }[] = [];
    const financialData: string[] = [];
    const tables: string[][] = [];

    // Split by major sections
    const parts = text.split(/===\s*([^=]+)\s*===/);
    
    if (parts.length > 1) {
      // First part is main content
      if (parts[0].trim()) {
        sections.push({
          title: 'Contenu Principal',
          content: parts[0].trim(),
          type: 'text'
        });
      }

      // Process named sections
      for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i];
        const content = parts[i + 1];
        
        if (content && content.trim()) {
          const sectionType = title.toLowerCase().includes('financière') || title.toLowerCase().includes('tableau') ? 
            (title.toLowerCase().includes('tableau') ? 'table' : 'financial') : 'text';
          
          sections.push({
            title: title.trim(),
            content: content.trim(),
            type: sectionType
          });

          if (sectionType === 'financial') {
            financialData.push(...content.split('\n').filter(line => line.trim()));
          } else if (sectionType === 'table') {
            const tableRows = content.split('\n').map(row => row.split(' | '));
            tables.push(...tableRows.filter(row => row.length > 1));
          }
        }
      }
    } else {
      // No sections, treat as single content
      sections.push({
        title: 'Document',
        content: text,
        type: 'text'
      });
    }

    return { sections, financialData, tables };
  };

  const { sections, financialData, tables } = document?.extracted_text ? 
    processContent(document.extracted_text) : 
    { sections: [], financialData: [], tables: [] };

  // Search functionality
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  // Copy content to clipboard
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copié !",
        description: "Le contenu a été copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      });
    }
  };

  // Export content as text file
  const exportAsText = () => {
    if (!document?.extracted_text) return;
    
    const blob = new Blob([document.extracted_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.original_filename}_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to section
  const scrollToSection = (sectionTitle: string) => {
    const element = window.document.getElementById(`section-${sectionTitle}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setSelectedSection(sectionTitle);
    }
  };

  if (!document) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Aperçu du Document
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez un document pour voir son contenu</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyse en cours...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-pulse text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>Extraction et analyse du contenu...</p>
              <p className="text-sm">Cela peut prendre quelques instants</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasContent = document.extracted_text && document.extracted_text.length > 50;

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : 'h-full'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div className="flex flex-col">
              <span>{document.original_filename}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {document.file_type.toUpperCase()} • {hasContent ? `${sections.length} sections` : 'Contenu limité'}
              </span>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {hasContent && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(document.extracted_text!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportAsText}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {hasContent && (
          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans le document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {financialData.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  {financialData.length} données financières
                </Badge>
              )}
              {tables.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {tables.length} tableaux
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {/* AI Analysis Section */}
      {(document.ai_summary || document.analysis_status === 'ai_processing') && (
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Analyse IA</h3>
                {document.analysis_status === 'ai_processing' ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    En cours...
                  </Badge>
                ) : (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Terminée
                  </Badge>
                )}
              </div>

              {document.ai_summary && (
                <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-3 border">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    Résumé
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {document.ai_summary}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {document.document_type && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileType2 className="h-3 w-3" />
                    {document.document_type}
                  </Badge>
                )}
                
                {document.is_financial && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <TrendingUp className="h-3 w-3" />
                    Document Financier
                  </Badge>
                )}

                {document.structure_info?.estimatedPages && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    ~{document.structure_info.estimatedPages} pages
                  </Badge>
                )}

                {document.structure_info?.hasNumbers && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Données numériques
                  </Badge>
                )}

                {document.structure_info?.hasTables && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Tableaux détectés
                  </Badge>
                )}
              </div>

              {document.key_points && document.key_points.length > 0 && (
                <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-3 border">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Points Clés
                  </h4>
                  <ul className="space-y-1">
                    {document.key_points.slice(0, 3).map((point, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {document.key_points.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{document.key_points.length - 3} autres points
                    </p>
                  )}
                </div>
              )}

              {document.analysis_status === 'ai_processing' && !document.ai_summary && (
                <div className="bg-white/70 dark:bg-slate-900/70 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Analyse en cours...</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    L'IA analyse le contenu du document pour extraire un résumé, identifier les points clés et catégoriser le document.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {!hasContent ? (
          <div className="p-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">Contenu non disponible</h3>
            <p className="text-sm">
              {document.analysis_status === 'minimal_content' ? 
                'Le contenu du document est limité ou dans un format complexe.' :
                'L\'extraction du contenu n\'a pas encore été effectuée.'
              }
            </p>
            <p className="text-sm mt-2">
              Utilisez le chat IA pour analyser le document même sans extraction textuelle.
            </p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Table of Contents */}
            {sections.length > 1 && (
              <div className="w-64 border-r bg-muted/30">
                <div className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Sommaire
                  </h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-1">
                      {sections.map((section, index) => (
                        <Button
                          key={index}
                          variant={selectedSection === section.title ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => scrollToSection(section.title)}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {section.type === 'financial' ? (
                              <Calculator className="h-3 w-3 flex-shrink-0" />
                            ) : section.type === 'table' ? (
                              <BarChart3 className="h-3 w-3 flex-shrink-0" />
                            ) : (
                              <FileText className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="truncate text-xs">{section.title}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1">
              <ScrollArea className={isExpanded ? "h-[calc(100vh-120px)]" : "h-[600px]"}>
                <div className="p-6 space-y-6" ref={contentRef}>
                  {sections.map((section, index) => (
                    <div key={index} id={`section-${section.title}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {section.type === 'financial' ? (
                          <Calculator className="h-4 w-4 text-green-600" />
                        ) : section.type === 'table' ? (
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-600" />
                        )}
                        <h3 className="font-semibold">{section.title}</h3>
                        <Badge variant={
                          section.type === 'financial' ? 'default' : 
                          section.type === 'table' ? 'secondary' : 'outline'
                        }>
                          {section.type === 'financial' ? 'Financier' : 
                           section.type === 'table' ? 'Tableau' : 'Texte'}
                        </Badge>
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: highlightText(section.content, searchTerm)
                          }}
                        />
                      </div>
                      
                      {index < sections.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}