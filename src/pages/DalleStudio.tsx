import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DalleStudio = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Veuillez entrer une description");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('dalle-image', {
        body: {
          prompt,
          size,
          quality
        }
      });

      if (error) throw error;

      if (data.image) {
        setGeneratedImage(data.image);
        toast.success("Image générée avec succès!");
      } else {
        throw new Error("Aucune image générée");
      }
    } catch (error) {
      console.error('Erreur génération DALL-E:', error);
      toast.error("Erreur lors de la génération de l'image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `dalle-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/app')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au chat
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Studio DALL-E</h1>
        <p className="text-muted-foreground">Générez des images avec l'intelligence artificielle DALL-E</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Décrivez l'image que vous souhaitez générer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="prompt">Description de l'image</Label>
              <Textarea
                id="prompt"
                placeholder="Décrivez en détail l'image que vous voulez générer..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size">Taille</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">1024x1024 (Carré)</SelectItem>
                    <SelectItem value="1792x1024">1792x1024 (Paysage)</SelectItem>
                    <SelectItem value="1024x1792">1024x1792 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quality">Qualité</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer l'image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Résultat</CardTitle>
            <CardDescription>
              Votre image générée apparaîtra ici
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImage ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src={generatedImage} 
                    alt="Image générée"
                    className="w-full h-auto"
                  />
                </div>
                <Button onClick={handleDownload} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground">Aucune image générée</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DalleStudio;