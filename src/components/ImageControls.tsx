import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ImageService, ImageGenerationOptions, ImageEditOptions, ImageVariationOptions } from "@/services/imageService";
import { useToast } from "@/hooks/use-toast";
import { Image, Edit, Shuffle, Sparkles, Loader2, Settings, Zap } from "lucide-react";

interface ImageControlsProps {
  onImageGenerated: (imageUrl: string, type: 'generation' | 'edit' | 'variation') => void;
}

export const ImageControls = ({ onImageGenerated }: ImageControlsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'variations'>('generate');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [runwareAvailable, setRunwareAvailable] = useState(false);
  
  
  // Generation state
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [quality, setQuality] = useState<'hd' | 'standard'>('hd');
  const [provider, setProvider] = useState<'dalle' | 'runware'>('dalle');
  
  // Options avancées Runware pour fidélité
  const [cfgScale, setCfgScale] = useState(12); // Fidélité au prompt
  const [steps, setSteps] = useState(25); // Qualité/détails
  const [seed, setSeed] = useState<number | undefined>();
  
  // Edit state
  const [editPrompt, setEditPrompt] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [editSize, setEditSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  
  // Variations state
  const [variationImage, setVariationImage] = useState<File | null>(null);
  const [variationCount, setVariationCount] = useState(2);
  const [variationSize, setVariationSize] = useState<'1024x1024' | '512x512' | '256x256'>('1024x1024');
  
  const editImageRef = useRef<HTMLInputElement>(null);
  const maskImageRef = useRef<HTMLInputElement>(null);
  const variationImageRef = useRef<HTMLInputElement>(null);
  
  
  const { toast } = useToast();

  // Initialiser Runware au chargement
  useEffect(() => {
    const initRunware = async () => {
      const available = await ImageService.initRunware();
      setRunwareAvailable(available);
      if (available) {
        setProvider('runware'); // Utiliser Runware par défaut si disponible
      }
    };
    initRunware();
  }, []);


  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Veuillez entrer une description de l'image à générer",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const options: ImageGenerationOptions = {
        prompt: prompt.trim(),
        size,
        quality,
        provider,
        // Options avancées Runware
        cfgScale: provider === 'runware' ? cfgScale : undefined,
        steps: provider === 'runware' ? steps : undefined,
        seed: provider === 'runware' && seed ? seed : undefined,
      };
      
      const imageUrl = await ImageService.generateImage(options);
      onImageGenerated(imageUrl, 'generation');
      
      toast({
        title: "Image générée avec succès",
        description: `Image créée avec ${provider === 'runware' ? 'Runware (Haute Fidélité)' : 'DALL-E 3'}`
      });
      
      setPrompt('');
    } catch (error) {
      console.error('Erreur génération:', error);
      toast({
        title: "Erreur de génération",
        description: error instanceof Error ? error.message : "Échec de la génération d'image",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!editImage || !editPrompt.trim()) {
      toast({
        title: "Image et prompt requis",
        description: "Veuillez sélectionner une image et entrer une description des modifications",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const options: ImageEditOptions = {
        image: editImage,
        prompt: editPrompt,
        mask: maskImage || undefined,
        size: editSize,
        quality
      };
      
      const imageUrl = await ImageService.editImage(options);
      onImageGenerated(imageUrl, 'edit');
      
      toast({
        title: "Image éditée avec succès",
        description: "Votre image a été modifiée avec DALL-E 2"
      });
      
      setEditPrompt('');
      setEditImage(null);
      setMaskImage(null);
      if (editImageRef.current) editImageRef.current.value = '';
      if (maskImageRef.current) maskImageRef.current.value = '';
    } catch (error) {
      console.error('Erreur édition:', error);
      toast({
        title: "Erreur d'édition",
        description: error instanceof Error ? error.message : "Échec de l'édition d'image",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVariations = async () => {
    if (!variationImage) {
      toast({
        title: "Image requise",
        description: "Veuillez sélectionner une image pour créer des variations",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const options: ImageVariationOptions = {
        image: variationImage,
        n: variationCount,
        size: variationSize,
        quality
      };
      
      const imageUrls = await ImageService.createVariations(options);
      
      // Envoyer toutes les variations
      imageUrls.forEach(url => onImageGenerated(url, 'variation'));
      
      toast({
        title: "Variations créées avec succès",
        description: `${imageUrls.length} variations ont été créées avec DALL-E 2`
      });
      
      setVariationImage(null);
      if (variationImageRef.current) variationImageRef.current.value = '';
    } catch (error) {
      console.error('Erreur variations:', error);
      toast({
        title: "Erreur de variations",
        description: error instanceof Error ? error.message : "Échec de la création de variations",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Studio d'Images IA
          <div className="flex gap-2">
            <Badge variant="secondary">DALL-E</Badge>
            {runwareAvailable && <Badge variant="default" className="bg-green-600">Runware</Badge>}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Génération d'images avec DALL-E (OpenAI) et Runware (Haute Fidélité)
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tab Selection */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'generate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('generate')}
            className="flex items-center gap-2"
          >
            <Image className="h-4 w-4" />
            Générer
          </Button>
          <Button
            variant={activeTab === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('edit')}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Éditer
          </Button>
          <Button
            variant={activeTab === 'variations' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('variations')}
            className="flex items-center gap-2"
          >
            <Shuffle className="h-4 w-4" />
            Variations
          </Button>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-4">
            {/* Message si Runware pas disponible */}
            {!runwareAvailable && (
              <div className="p-4 border border-dashed border-blue-300 rounded-lg bg-blue-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Runware en cours d'initialisation</span>
                </div>
                <p className="text-sm text-blue-700">
                  Le service Runware (haute fidélité) se connecte automatiquement...
                </p>
              </div>
            )}

            {/* Choix du provider */}
            <div className="space-y-2">
              <Label>Moteur de génération</Label>
              <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dalle">
                    <div className="flex items-center gap-2">
                      <span>DALL-E 3 (OpenAI)</span>
                      <Badge variant="outline" className="text-xs">Rapide</Badge>
                    </div>
                  </SelectItem>
                  {runwareAvailable && (
                    <SelectItem value="runware">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        <span>Runware</span>
                        <Badge variant="default" className="text-xs bg-green-600">Haute Fidélité</Badge>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Description de l'image</Label>
              <Textarea
                id="prompt"
                placeholder="Décrivez précisément l'image que vous souhaitez générer..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px]"
              />
              {provider === 'runware' && (
                <p className="text-xs text-green-700">
                  💡 Runware excelle avec des descriptions détaillées et spécifiques
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taille</Label>
                <Select value={size} onValueChange={(value: any) => setSize(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">Carré (1024×1024)</SelectItem>
                    <SelectItem value="1792x1024">Paysage (1792×1024)</SelectItem>
                    <SelectItem value="1024x1792">Portrait (1024×1792)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Qualité</Label>
                <Select value={quality} onValueChange={(value: any) => setQuality(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hd">Haute définition</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options avancées Runware */}
            {provider === 'runware' && (
              <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-green-600" />
                  <Label className="text-green-800 font-medium">Options Haute Fidélité</Label>
                  <Switch 
                    checked={showAdvanced} 
                    onCheckedChange={setShowAdvanced}
                  />
                </div>
                
                {showAdvanced && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Fidélité au prompt: {cfgScale}</Label>
                      <Slider
                        value={[cfgScale]}
                        onValueChange={(value) => setCfgScale(value[0])}
                        max={20}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Plus élevé = plus fidèle à votre description (recommandé: 12-15)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Étapes de génération: {steps}</Label>
                      <Slider
                        value={[steps]}
                        onValueChange={(value) => setSteps(value[0])}
                        max={50}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Plus élevé = plus de détails mais plus lent (recommandé: 20-30)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="seed">Seed (optionnel)</Label>
                      <Input
                        id="seed"
                        type="number"
                        placeholder="Nombre aléatoire pour reproduire une image"
                        value={seed || ''}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {provider === 'runware' ? 'Génération Runware...' : 'Génération DALL-E 3...'}
                </>
              ) : (
                <>
                  {provider === 'runware' ? (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Générer avec Runware (Haute Fidélité)
                    </>
                  ) : (
                    <>
                      <Image className="mr-2 h-4 w-4" />
                      Générer avec DALL-E 3
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Edit Tab */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-image">Image à éditer</Label>
              <Input
                id="edit-image"
                type="file"
                accept="image/*"
                ref={editImageRef}
                onChange={(e) => setEditImage(e.target.files?.[0] || null)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mask-image">Masque (optionnel)</Label>
              <Input
                id="mask-image"
                type="file"
                accept="image/*"
                ref={maskImageRef}
                onChange={(e) => setMaskImage(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Le masque définit les zones à modifier (transparent = à éditer)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-prompt">Description des modifications</Label>
              <Textarea
                id="edit-prompt"
                placeholder="Décrivez les modifications à apporter..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Taille</Label>
              <Select value={editSize} onValueChange={(value: any) => setEditSize(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Carré (1024×1024)</SelectItem>
                  <SelectItem value="1792x1024">Paysage (1792×1024)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (1024×1792)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleEdit}
              disabled={isGenerating || !editImage || !editPrompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Édition avec DALL-E 2...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Éditer avec DALL-E 2
                </>
              )}
            </Button>
          </div>
        )}

        {/* Variations Tab */}
        {activeTab === 'variations' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variation-image">Image source</Label>
              <Input
                id="variation-image"
                type="file"
                accept="image/*"
                ref={variationImageRef}
                onChange={(e) => setVariationImage(e.target.files?.[0] || null)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de variations</Label>
                <Select value={variationCount.toString()} onValueChange={(value) => setVariationCount(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 variation</SelectItem>
                    <SelectItem value="2">2 variations</SelectItem>
                    <SelectItem value="3">3 variations</SelectItem>
                    <SelectItem value="4">4 variations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Taille</Label>
                <Select value={variationSize} onValueChange={(value: any) => setVariationSize(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">1024×1024</SelectItem>
                    <SelectItem value="512x512">512×512</SelectItem>
                    <SelectItem value="256x256">256×256</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleVariations}
              disabled={isGenerating || !variationImage}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création avec DALL-E 2...
                </>
              ) : (
                <>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Créer des variations avec DALL-E 2
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};