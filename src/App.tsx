import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/core/auth/AuthContext";
import { ThemeProvider } from "next-themes";
import { DocumentHead } from "@/components/DocumentHead";
import { getEnabledRoutes } from "@/config/featureRegistry";
import "@/config/featureRegistrations";

import AuthPage from "@/core/auth/AuthPage";
import AuthCallbackPage from "@/core/auth/AuthCallbackPage";
import HomePage from "./pages/HomePage";
import PeoplePage from "@/core/members/PeoplePage";
import MemberProfilePage from "@/core/members/MemberProfilePage";
import EventsPage from "@/features/events/pages/EventsPage";
import ChapterPage from "./pages/ChapterPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/NotFound";
import OnboardingPage from "@/core/auth/OnboardingPage";

const queryClient = new QueryClient();

const featureRoutes = getEnabledRoutes();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <DocumentHead />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Core routes - always present */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/people/:id" element={<MemberProfilePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/chapter" element={<ChapterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />

              {/* Feature routes - dynamically registered */}
              {featureRoutes.map(r => (
                <Route key={r.path} path={r.path} element={<r.component />} />
              ))}

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
