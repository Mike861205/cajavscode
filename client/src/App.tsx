import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { SubscriptionGuardWrapper } from "@/components/subscription/subscription-guard-wrapper";
import { SuspensionProvider } from "@/contexts/suspension-context";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import SubscribePage from "@/pages/subscribe";
import PricingPage from "@/pages/pricing-page";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AccountSuspended from "@/pages/account-suspended";
import OrganizationalCatalog from "@/pages/organizational-catalog";
import ProductCosts from "@/pages/product-costs";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import RegistrationToasts from "@/components/registration-toasts";
import { SuspensionModalManager } from "@/components/suspension-modal-manager";
import { AIChatWidget } from "@/components/ai-chat/ai-chat-widget";
import { SettingsProvider } from "@/contexts/SettingsContext";
import StoreFrontend from "@/pages/store-frontend";

import { useLocation } from "wouter";

// Add error boundary
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({error}: {error: Error}) {
  return (
    <div style={{padding: "20px", color: "red"}}>
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={() => window.location.reload()}>Reload page</button>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Solo mostrar WhatsApp en páginas públicas (no en dashboard ni en tienda)
  const showWhatsApp = !location.startsWith('/dashboard') && !location.startsWith('/admin') && !location.startsWith('/store/');
  
  // Mostrar chat IA solo en dashboard
  const showAIChat = location.startsWith('/dashboard');
  
  return (
    <>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/subscribe" component={SubscribePage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/subscription-plans" component={PricingPage} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/account-suspended" component={AccountSuspended} />
        <Route path="/store/:subdomain" component={StoreFrontend} />

        <ProtectedRoute path="/dashboard/:section?/:subsection?">
          <SubscriptionGuardWrapper>
            <Dashboard />
          </SubscriptionGuardWrapper>
        </ProtectedRoute>
        <Route component={NotFound} />
      </Switch>
      {showWhatsApp && <WhatsAppFloat />}
      {showWhatsApp && <RegistrationToasts />}
      {/* {showAIChat && <AIChatWidget />} */}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <SuspensionProvider>
          <AuthProvider>
            <SettingsProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
                <SuspensionModalManager />
              </TooltipProvider>
            </SettingsProvider>
          </AuthProvider>
        </SuspensionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
