import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import Landing from "./pages/Landing";
import NewLanding from "./pages/NewLanding";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import VideoTranslator from "./pages/VideoTranslator";
import Ebooks from "./pages/Ebooks";
import DalleStudio from "./pages/DalleStudio";
import TTSStudio from "./pages/TTSStudio";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewLanding />} />
        <Route path="/old-landing" element={<Landing />} />
        <Route path="/app" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/video-translator" element={<VideoTranslator />} />
        <Route path="/ebooks" element={<Ebooks />} />
        <Route path="/dalle-studio" element={<DalleStudio />} />
        <Route path="/tts-studio" element={<TTSStudio />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
