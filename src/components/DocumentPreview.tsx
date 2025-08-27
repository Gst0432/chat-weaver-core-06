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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-2xl">{getFileTypeIcon()}</span>
                {file.name}
              </h1>
              <p className="text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Uploadé le {new Date(file.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          
          <Button onClick={onOpenChat} className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat avec l'IA
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <Card className="h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Aperçu du contenu</CardTitle>
                  {file.translations && Object.keys(file.translations).length > 0 && (
                    <select 
                      className="px-3 py-1 border rounded text-sm"
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
              </CardHeader>
              <CardContent className="h-full p-0">
                <ScrollArea className="h-full p-6">
                  {file.analysis ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedTranslation && file.translations?.[selectedTranslation] 
                          ? file.translations[selectedTranslation]
                          : file.analysis
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">Aperçu non disponible</h3>
                      <p className="text-muted-foreground mb-4">
                        Analysez le document pour voir son contenu
                      </p>
                      <Button onClick={() => onAnalyze(file.id)} disabled={analyzing}>
                        {analyzing ? 'Analyse en cours...' : 'Analyser maintenant'}
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}