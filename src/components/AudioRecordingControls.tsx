import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Play, Pause, Download, FileText } from "lucide-react";
import { AudioRecorderService, RecordingState } from "@/services/audioRecorderService";

interface AudioRecordingControlsProps {
  recordingState: RecordingState;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onTranscribe?: () => void;
  onDownload?: () => void;
  isTranscribing?: boolean;
  compact?: boolean;
}

export const AudioRecordingControls: React.FC<AudioRecordingControlsProps> = ({
  recordingState,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onTranscribe,
  onDownload,
  isTranscribing = false,
  compact = false
}) => {
  const { isRecording, isPaused, duration, size } = recordingState;

  const renderRecordingButton = () => {
    if (!isRecording && !isPaused) {
      return (
        <Button 
          onClick={onStartRecording}
          className="bg-red-500 hover:bg-red-600 text-white"
          size={compact ? "sm" : "default"}
        >
          <Mic className="w-4 h-4 mr-2" />
          Commencer l'enregistrement
        </Button>
      );
    }

    if (isRecording) {
      return (
        <div className="flex gap-2">
          <Button 
            onClick={onPauseRecording}
            variant="outline"
            size={compact ? "sm" : "default"}
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button 
            onClick={onStopRecording}
            className="bg-red-500 hover:bg-red-600 text-white"
            size={compact ? "sm" : "default"}
          >
            <Square className="w-4 h-4 mr-2" />
            Arrêter
          </Button>
        </div>
      );
    }

    if (isPaused) {
      return (
        <div className="flex gap-2">
          <Button 
            onClick={onResumeRecording}
            className="bg-green-500 hover:bg-green-600 text-white"
            size={compact ? "sm" : "default"}
          >
            <Play className="w-4 h-4 mr-2" />
            Reprendre
          </Button>
          <Button 
            onClick={onStopRecording}
            className="bg-red-500 hover:bg-red-600 text-white"
            size={compact ? "sm" : "default"}
          >
            <Square className="w-4 h-4 mr-2" />
            Arrêter
          </Button>
        </div>
      );
    }
  };

  const renderStatus = () => {
    if (!isRecording && !isPaused) return null;

    return (
      <div className={`flex ${compact ? 'flex-row gap-4' : 'flex-col'} gap-2`}>
        <div className="flex items-center gap-2">
          <Badge variant={isRecording ? "destructive" : "secondary"}>
            {isRecording ? "Enregistrement..." : "En pause"}
          </Badge>
          {(isRecording || isPaused) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Durée: {AudioRecorderService.formatDuration(duration)}</span>
              <span>Taille: {AudioRecorderService.formatSize(size)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPostRecordingActions = () => {
    if (isRecording || isPaused || (!onTranscribe && !onDownload)) return null;

    return (
      <div className="flex gap-2 mt-2">
        {onTranscribe && (
          <Button 
            onClick={onTranscribe}
            disabled={isTranscribing}
            size={compact ? "sm" : "default"}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isTranscribing ? "Transcription..." : "Transcrire avec IA"}
          </Button>
        )}
        {onDownload && (
          <Button 
            onClick={onDownload}
            variant="outline"
            size={compact ? "sm" : "default"}
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {renderRecordingButton()}
        </div>
        {renderStatus()}
        {renderPostRecordingActions()}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Enregistrement Audio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderRecordingButton()}
        {renderStatus()}
        {renderPostRecordingActions()}
      </CardContent>
    </Card>
  );
};