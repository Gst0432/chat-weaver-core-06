import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface ChatLayoutProps {
  children: ReactNode;
}

export const ChatLayout = ({ children }: ChatLayoutProps) => {
  return (
    <div className="h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};