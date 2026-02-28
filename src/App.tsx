import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";

import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import PeoplePage from "./pages/PeoplePage";
import MemberProfilePage from "./pages/MemberProfilePage";
import EventsPage from "./pages/EventsPage";
import ChapterPage from "./pages/ChapterPage";
import EOPPage from "./pages/EOPPage";
import PDPPage from "./pages/PDPPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/people/:id" element={<MemberProfilePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/chapter" element={<ChapterPage />} />
              <Route path="/eop" element={<EOPPage />} />
              <Route path="/pdp" element={<PDPPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
