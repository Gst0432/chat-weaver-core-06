import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus, Settings, Zap } from "lucide-react";

export const Sidebar = () => {
  return (
    <aside className="w-80 bg-card border-r border-border p-4 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Chat Weaver</h1>
        </div>
        <Button variant="default" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Conversations récentes</h3>
        <div className="space-y-2">
          {[
            "Introduction à l'IA",
            "Code Python avancé",
            "Stratégies marketing",
            "Analyse de données"
          ].map((title, index) => (
            <Card key={index} className="p-3 bg-secondary/50 border-secondary hover:bg-secondary/70 cursor-pointer transition-colors">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">Il y a {index + 1}h</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </Button>
      </div>
    </aside>
  );
};