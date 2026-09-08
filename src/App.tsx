import { Suspense, lazy, type ComponentType } from "react";
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
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { RouteAnnouncer } from "@/components/a11y/RouteAnnouncer";
import { LoadingStatus } from "@/components/a11y/LoadingStatus";
import { AccessibilityProvider } from "@/components/a11y/AccessibilityProvider";

import AuthPage from "@/core/auth/AuthPage";
import AuthCallbackPage from "@/core/auth/AuthCallbackPage";
import ResetPasswordPage from "@/core/auth/ResetPasswordPage";
import InviteGatePage from "@/core/auth/InviteGatePage";
import { NativeAuthBridge } from "@/core/auth/NativeAuthBridge";
import HomePage from "./pages/HomePage";
import { NativePushBridge } from "@/components/native/NativePushBridge";
import { NativeChromeBridge } from "@/components/native/NativeChromeBridge";
import { PwaLaunchBridge } from "@/components/pwa/PwaLaunchBridge";
import { PwaBackgroundSyncBridge } from "@/components/pwa/PwaBackgroundSyncBridge";

const PeoplePage = lazy(() => import("@/core/members/PeoplePage"));
const MemberProfilePage = lazy(() => import("@/core/members/MemberProfilePage"));
const EventsPage = lazy(() => import("@/features/events/pages/EventsPage"));
const ChapterPage = lazy(() => import("./pages/ChapterPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OnboardingPage = lazy(() => import("@/core/auth/OnboardingPage"));
const PwaOpenPage = lazy(() => import("./pages/PwaOpenPage"));
const PwaProtocolPage = lazy(() => import("./pages/PwaProtocolPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const featureRoutes = getEnabledRoutes();

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <LoadingStatus label="Loading page" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AccessibilityProvider>
        <TooltipProvider>
          <DocumentHead />
          <SkipToContent />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NativeAuthBridge />
              <NativeChromeBridge />
              <PwaLaunchBridge />
              <PwaBackgroundSyncBridge />
              <NativePushBridge />
              <RouteAnnouncer />
              <ConnectivityBanner />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/invite" element={<InviteGatePage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/" element={<HomePage />} />
                  <Route path="/people" element={<PeoplePage />} />
                  <Route path="/people/:id" element={<MemberProfilePage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/chapter" element={<ChapterPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/pwa-open" element={<PwaOpenPage />} />
                  <Route path="/pwa-protocol" element={<PwaProtocolPage />} />

                  {featureRoutes.map((r) => {
                    const Comp = r.component as ComponentType;
                    return <Route key={r.path} path={r.path} element={<Comp />} />;
                  })}

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
