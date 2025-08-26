import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Play, Calendar, Clock, Settings } from 'lucide-react';
import { VideoHistoryItem } from '@/hooks/useVideoHistory';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VideoHistoryProps {
  history: VideoHistoryItem[];
  loading: boolean;
  onDelete: (id: string) => void;
  onReplay: (item: VideoHistoryItem) => void;
}

export const VideoHistory: React.FC<VideoHistoryProps> = ({
  history,
  loading,
  onDelete,
  onReplay,
}) => {
  const handleDownload = (url: string, prompt: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getAspectRatioLabel = (ratio: string) => {
    switch (ratio) {
      case '16:9': return '1920×1080 (16:9)';
      case '1:1': return '1080×1080 (1:1)';
      case '9:16': return '1080×1920 (9:16)';
      default: return ratio;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique des vidéos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Chargement de l'historique...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique des vidéos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune vidéo générée pour le moment
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historique des vidéos ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-2">
                <p className="font-medium text-sm">{item.prompt}</p>
                {item.negative_prompt && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Prompt négatif:</span> {item.negative_prompt}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.duration}s
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    CFG: {item.cfg_scale}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getAspectRatioLabel(item.aspect_ratio)}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReplay(item)}
                  className="text-xs"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Rejouer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(item.video_url, item.prompt)}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Télécharger
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>

            {/* Video preview */}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                src={item.video_url}
                controls
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Video load error:', e);
                  const target = e.target as HTMLVideoElement;
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'flex items-center justify-center h-full text-muted-foreground text-sm';
                  errorDiv.textContent = 'Vidéo non disponible (URL expirée)';
                  target.parentNode?.appendChild(errorDiv);
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};