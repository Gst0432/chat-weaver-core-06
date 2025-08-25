import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus, ArrowLeft } from 'lucide-react';
import { EbooksList } from '@/components/EbooksList';
import { EbookEditor } from '@/components/EbookEditor';
import { EbookGenerator } from '@/components/EbookGenerator';

interface Ebook {
  id: string;
  title: string;
  author: string;
  content_markdown: string;
  created_at: string;
}

const Ebooks = () => {
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth", { replace: true });
      } else {
        setAuthReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth", { replace: true });
      } else {
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!authReady) return null;

  const handleEdit = (ebook: Ebook) => {
    setEditingEbook(ebook);
    setActiveTab('editor');
  };

  const handleSave = () => {
    setEditingEbook(null);
    setActiveTab('list');
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setEditingEbook(null);
    setActiveTab('list');
  };

  const handleEbookGenerated = () => {
    setActiveTab('list');
    setRefreshKey(prev => prev + 1);
  };

  const handleNewEbook = () => {
    setEditingEbook(null);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au chat
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-primary" />
                Mes Ebooks
              </h1>
              <p className="text-muted-foreground">
                Créez des ebooks en 90-120 secondes avec l'IA ultra-rapide ⚡
              </p>
            </div>
          </div>
          
          {activeTab === 'list' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleNewEbook}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
              <Button
                onClick={() => setActiveTab('generator')}
                className="bg-gradient-primary hover:shadow-glow"
              >
                Générer Ultra-Rapide ⚡
              </Button>
            </div>
          )}
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="list">Mes Ebooks</TabsTrigger>
            <TabsTrigger value="generator">Générateur IA</TabsTrigger>
            <TabsTrigger value="editor">Éditeur</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <EbooksList onEdit={handleEdit} onRefresh={refreshKey} />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <EbookGenerator onEbookGenerated={handleEbookGenerated} />
          </TabsContent>

          <TabsContent value="editor" className="space-y-6">
            <EbookEditor
              ebook={editingEbook}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Ebooks;