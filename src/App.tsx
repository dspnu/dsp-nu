import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import MembersPage from "./pages/MembersPage";
import EventsPage from "./pages/EventsPage";

import PointsPage from "./pages/PointsPage";
import JobsPage from "./pages/JobsPage";
import AlumniPage from "./pages/AlumniPage";
import ResourcesPage from "./pages/ResourcesPage";
import CoffeeChatsPage from "./pages/CoffeeChatsPage";
import EOPPage from "./pages/EOPPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/events" element={<EventsPage />} />
            
            <Route path="/points" element={<PointsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/alumni" element={<AlumniPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/coffee-chats" element={<CoffeeChatsPage />} />
            <Route path="/eop" element={<EOPPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
