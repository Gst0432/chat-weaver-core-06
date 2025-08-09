import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface ChatLayoutProps {
  children: ReactNode;
}

export const ChatLayout = ({ children }: ChatLayoutProps) => {
  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center px-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Ouvrir l'historique</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <SheetHeader className="sr-only">
              <SheetTitle>Historique</SheetTitle>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <h1 className="ml-3 text-sm text-muted-foreground">Chatelix</h1>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};