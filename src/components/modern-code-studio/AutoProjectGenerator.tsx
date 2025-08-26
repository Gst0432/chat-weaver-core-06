import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Rocket, Sparkles, Database, Zap, Globe, FileCode, Wand2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: 'react-app' | 'component' | 'prototype';
  icon: any;
  complexity: 'simple' | 'medium' | 'advanced';
  features: string[];
  prompt: string;
}

interface AutoProjectGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectGenerated: (project: any) => void;
}

export function AutoProjectGenerator({ isOpen, onClose, onProjectGenerated }: AutoProjectGeneratorProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const projectTemplates: ProjectTemplate[] = [
    {
      id: 'todo-app',
      name: 'Todo Application',
      description: 'Application de gestion de tâches moderne avec persistance',
      type: 'react-app',
      icon: Rocket,
      complexity: 'simple',
      features: ['CRUD tâches', 'Filtres', 'Local Storage', 'Drag & Drop'],
      prompt: 'Crée une application todo complète avec React, TypeScript, Tailwind CSS. Inclus : ajout/suppression/modification de tâches, filtrage (toutes/actives/terminées), persistance en localStorage, design moderne avec animations, drag & drop pour réorganiser.'
    },
    {
      id: 'dashboard',
      name: 'Dashboard Admin',
      description: 'Interface administrateur avec graphiques et données',
      type: 'react-app',
      icon: Database,
      complexity: 'medium',
      features: ['Sidebar navigation', 'Graphiques', 'Tables', 'Stats'],
      prompt: 'Génère un dashboard administrateur moderne avec : sidebar collapsible, section statistiques avec graphiques, tableau de données interactif, gestion d\'utilisateurs, design dark/light mode, responsive mobile.'
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Store',
      description: 'Boutique en ligne avec panier et checkout',
      type: 'react-app',
      icon: Globe,
      complexity: 'advanced',
      features: ['Catalogue produits', 'Panier', 'Checkout', 'Recherche'],
      prompt: 'Développe un site e-commerce complet : catalogue de produits avec filtres, système de panier, page checkout, barre de recherche, wishlist, responsive design, gestion d\'état avancée.'
    },
    {
      id: 'blog',
      name: 'Blog Platform',
      description: 'Plateforme de blog avec éditeur markdown',
      type: 'react-app',
      icon: FileCode,
      complexity: 'medium',
      features: ['Éditeur markdown', 'Articles', 'Commentaires', 'Tags'],
      prompt: 'Crée une plateforme de blog moderne : éditeur markdown intégré, liste d\'articles avec preview, système de tags, commentaires, lecture time estimation, SEO optimized.'
    },
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Page d\'atterrissage avec sections modernes',
      type: 'react-app',
      icon: Sparkles,
      complexity: 'simple',
      features: ['Hero section', 'Features', 'Pricing', 'Contact'],
      prompt: 'Génère une landing page moderne avec : hero section impactante, section features avec icônes, pricing table, testimonials, footer avec contact, animations smooth, CTA optimisés.'
    },
    {
      id: 'portfolio',
      name: 'Portfolio Developer',
      description: 'Portfolio professionnel pour développeur',
      type: 'react-app',
      icon: Wand2,
      complexity: 'medium',
      features: ['Projets showcase', 'Skills', 'Contact', 'Dark mode'],
      prompt: 'Développe un portfolio de développeur professionnel : showcase projets avec descriptions, section compétences, about me, contact form, dark/light mode, animations élégantes.'
    }
  ];

  const generateProject = async () => {
    if (!selectedTemplate && !customPrompt.trim()) {
      toast({
        title: "Erreur",
        description: "Sélectionnez un template ou décrivez votre projet",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const prompt = selectedTemplate?.prompt || customPrompt;
      const name = projectName || selectedTemplate?.name || 'Nouveau Projet';

      // Génération automatique via IA
      const enhancedPrompt = `LOVABLE AI - GÉNÉRATION AUTOMATIQUE DE PROJET REACT COMPLET

DEMANDE: ${prompt}

MISSION: Génère un projet React COMPLET et fonctionnel immédiatement utilisable.

STRUCTURE OBLIGATOIRE:
1. App.tsx - Composant principal avec toute la fonctionnalité
2. Styles CSS - Design moderne avec Tailwind
3. Types TypeScript - Interfaces et utilitaires

TECHNOLOGIES:
- React 18 + TypeScript + Hooks
- Tailwind CSS (design moderne)
- Architecture scalable
- Code production-ready

REQUIREMENTS CRITIQUES:
✅ Code immédiatement fonctionnel
✅ Design responsive et moderne
✅ Interactions utilisateur fluides
✅ Structure de données logique
✅ Gestion d'état appropriée
✅ Types TypeScript complets

SÉPARATION OBLIGATOIRE:
1. \`\`\`tsx (composant React complet)
2. \`\`\`css (styles Tailwind + customs)
3. \`\`\`typescript (types et utils)

GÉNÈRE MAINTENANT:`;

      const response = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [{ role: 'user', content: enhancedPrompt }],
          model: "gpt-4o",
          max_tokens: 4000
        }
      });

      if (response.error) throw response.error;

      // Extraire le code généré
      const generatedCode = response.data.generatedText;
      const { tsx, css, typescript } = extractCodeBlocks(generatedCode);

      // Sauvegarder le projet
      const projectData = {
        user_id: user.id,
        app_name: name,
        app_type: selectedTemplate?.type || 'react-app',
        industry: 'web-development',
        generated_content: {
          tsx: tsx || getDefaultTSX(name),
          css: css || getDefaultCSS(),
          typescript: typescript || getDefaultTypeScript()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('generated_apps')
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;

      // Formater pour le composant parent
      const newProject = {
        id: data.id,
        name: data.app_name,
        type: data.app_type,
        tsx: projectData.generated_content.tsx,
        css: projectData.generated_content.css,
        typescript: projectData.generated_content.typescript,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      onProjectGenerated(newProject);
      onClose();

      toast({
        title: "🚀 Projet généré automatiquement!",
        description: `${name} a été créé avec succès`
      });

    } catch (error) {
      console.error('Error generating project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le projet",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const extractCodeBlocks = (content: string) => {
    const tsxMatch = content.match(/```(?:tsx|jsx|react)\n([\s\S]*?)\n```/);
    const cssMatch = content.match(/```css\n([\s\S]*?)\n```/);
    const tsMatch = content.match(/```(?:typescript|ts)\n([\s\S]*?)\n```/);

    return {
      tsx: tsxMatch?.[1] || '',
      css: cssMatch?.[1] || '',
      typescript: tsMatch?.[1] || ''
    };
  };

  const getDefaultTSX = (name: string) => `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">${name}</h1>
        <p className="text-lg text-gray-600">Votre projet a été généré automatiquement!</p>
      </div>
    </div>
  );
}`;

  const getDefaultCSS = () => `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: "Inter", system-ui, sans-serif;
}`;

  const getDefaultTypeScript = () => `export interface AppProps {
  children?: React.ReactNode;
}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Génération Automatique de Projet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Templates prédéfinis */}
          <div>
            <h3 className="font-medium mb-3">Templates Prêts à l'Emploi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setProjectName(template.name);
                    setCustomPrompt('');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <template.icon className="w-6 h-6 text-primary mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant={template.complexity === 'simple' ? 'secondary' : template.complexity === 'medium' ? 'default' : 'destructive'}>
                          {template.complexity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {template.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.features.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Ou description personnalisée */}
          <div>
            <h3 className="font-medium mb-3">Ou Décrivez Votre Projet</h3>
            <Textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedTemplate(null);
                }
              }}
              placeholder="Décrivez le type d'application que vous souhaitez créer (ex: une app de recettes avec recherche et favoris, un site vitrine pour restaurant, etc.)"
              className="min-h-[100px]"
            />
          </div>

          {/* Nom du projet */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nom du Projet</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Mon Super Projet"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={generateProject}
              disabled={(!selectedTemplate && !customPrompt.trim()) || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Générer le Projet Automatiquement
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}