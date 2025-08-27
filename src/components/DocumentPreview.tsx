import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, MessageSquare, FileText, Download, Globe, RefreshCw, Eye } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  file_url?: string;
  created_at: string;
  analysis?: string;
  translations?: { [lang: string]: string };
}

interface DocumentPreviewProps {
  file: UploadedFile;
  onBack: () => void;
  onOpenChat: () => void;
  onAnalyze: (fileId: string) => void;
  onTranslate: (fileId: string, targetLang: string) => void;
  onConvert: (fileId: string) => void;
  analyzing?: boolean;
  translating?: boolean;
  converting?: boolean;
}

export default function DocumentPreview({ 
  file, 
  onBack, 
  onOpenChat, 
  onAnalyze,
  onTranslate,
  onConvert,
  analyzing = false,
  translating = false,
  converting = false
}: DocumentPreviewProps) {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('');

  const getFileTypeIcon = () => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    return '📁';
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-lg md:text-2xl">{getFileTypeIcon()}</span>
                <span className="truncate">{file.name}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          
          <Button onClick={onOpenChat} className="flex items-center gap-2 shrink-0">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat avec l'IA</span>
            <span className="sm:hidden">Chat</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Document Info & Actions */}
          <div className="space-y-6">
            {/* File Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nom:</span>
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge variant="outline">
                      {file.type.includes('pdf') ? 'PDF' : 'Word'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Taille:</span>
                    <span className="text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => onAnalyze(file.id)}
                  disabled={analyzing}
                  className="w-full flex items-center gap-2"
                  variant={file.analysis ? "secondary" : "default"}
                >
                  <Eye className="w-4 h-4" />
                  {analyzing ? 'Analyse en cours...' : file.analysis ? 'Re-analyser' : 'Analyser'}
                </Button>

                <Button
                  onClick={() => onTranslate(file.id, 'en')}
                  disabled={!file.analysis || translating}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  {translating ? 'Traduction...' : 'Traduire'}
                </Button>

                {file.type.includes('pdf') && (
                  <Button
                    onClick={() => onConvert(file.id)}
                    disabled={!file.analysis || converting}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {converting ? 'Conversion...' : 'PDF → Word'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Statut du traitement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${file.analysis ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Analyse IA</span>
                  {file.analysis && <Badge variant="default" className="bg-green-500">Terminé</Badge>}
                </div>
                
                {file.translations && Object.keys(file.translations).length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Traductions</span>
                    <Badge variant="secondary">
                      {Object.keys(file.translations).length} langue{Object.keys(file.translations).length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content Preview */}
          <div className="lg:col-span-2">
            <Card className="h-[400px] md:h-[600px]">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base md:text-lg">Aperçu du contenu</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {file.type.includes('pdf') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `data:${file.type};base64,${file.content}`;
                          link.download = file.name;
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </Button>
                    )}
                    {file.translations && Object.keys(file.translations).length > 0 && (
                      <select 
                        className="px-2 py-1 border rounded text-xs md:text-sm min-w-0"
                        value={selectedTranslation}
                        onChange={(e) => setSelectedTranslation(e.target.value)}
                      >
                        <option value="">Original</option>
                        {Object.entries(file.translations).map(([lang, _]) => (
                          <option key={lang} value={lang}>
                            {lang.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-full p-0 pb-4">
                {file.type.includes('pdf') ? (
                  // PDF Preview - Use object instead of iframe for better mobile compatibility
                  <div className="h-full border-t bg-secondary/5">
                    <div className="p-4 text-center">
                      <div className="inline-flex items-center gap-2 bg-background p-4 rounded-lg border">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">Document PDF</p>
                          <p className="text-sm text-muted-foreground">Cliquez pour télécharger et ouvrir</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `data:${file.type};base64,${file.content}`;
                            link.download = file.name;
                            link.click();
                          }}
                          className="w-full md:w-auto"
                        >
                          Ouvrir le PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Text Analysis Preview
                  <ScrollArea className="h-full p-3 md:p-6">
                    {file.analysis ? (
                      <div className="prose prose-sm max-w-none">
                        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-foreground">
                          Analyse du document
                        </h3>
                        <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed bg-secondary/20 p-3 md:p-4 rounded-lg">
                          {selectedTranslation && file.translations?.[selectedTranslation] 
                            ? file.translations[selectedTranslation]
                            : file.analysis
                          }
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <FileText className="w-8 md:w-12 h-8 md:h-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium text-base md:text-lg mb-2">Aperçu non disponible</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Analysez le document pour voir son contenu
                        </p>
                        <Button onClick={() => onAnalyze(file.id)} disabled={analyzing} className="w-full md:w-auto">
                          {analyzing ? 'Analyse en cours...' : 'Analyser maintenant'}
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                )}
                
                {/* Analysis section for PDFs */}
                {file.type.includes('pdf') && file.analysis && (
                  <div className="border-t p-3 md:p-4 bg-secondary/10">
                    <h4 className="font-semibold mb-2 text-foreground text-sm md:text-base">Analyse IA :</h4>
                    <ScrollArea className="h-24 md:h-32">
                      <div className="text-xs md:text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedTranslation && file.translations?.[selectedTranslation] 
                          ? file.translations[selectedTranslation]
                          : file.analysis
                        }
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}