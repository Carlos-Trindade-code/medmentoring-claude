import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { consumeReturnPath } from "./const";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect, lazy, Suspense } from "react";

// Eagerly loaded (critical path — small and needed immediately)
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import MenteeLogin from "./pages/MenteeLogin";
import AuthCallback from "./pages/AuthCallback";

// Lazily loaded (heavy pages — only loaded when navigated to)
const MentorDashboard = lazy(() => import("./pages/MentorDashboard"));
const MenteeDetail = lazy(() => import("./pages/MenteeDetail"));
const NewMentee = lazy(() => import("./pages/NewMentee"));
const MenteePortal = lazy(() => import("./pages/MenteePortal"));
const MenteeQuestionnaire = lazy(() => import("./pages/MenteeQuestionnaire"));
const MenteeDocuments = lazy(() => import("./pages/MenteeDocuments"));
const ImportData = lazy(() => import("./pages/ImportData"));
const PillarGuide = lazy(() => import("./pages/PillarGuide"));
const IvmpTool = lazy(() => import("./pages/IvmpTool"));
const FinancialDiagnostic = lazy(() => import("./pages/FinancialDiagnostic"));
const SalesTool = lazy(() => import("./pages/SalesTool"));
const Qualification = lazy(() => import("./pages/Qualification"));
const PricingTool = lazy(() => import("./pages/PricingTool"));
const Pillar1WorkRoom = lazy(() => import("./pages/Pillar1WorkRoom"));
const Pillar2WorkRoom = lazy(() => import("./pages/Pillar2WorkRoom"));
const Pillar3WorkRoom = lazy(() => import("./pages/Pillar3WorkRoom"));
const Pillar4WorkRoom = lazy(() => import("./pages/Pillar4WorkRoom"));
const Pillar5WorkRoom = lazy(() => import("./pages/Pillar5WorkRoom"));
const Pillar6WorkRoom = lazy(() => import("./pages/Pillar6WorkRoom"));
const Pillar7WorkRoom = lazy(() => import("./pages/Pillar7WorkRoom"));
const MentorPillarView = lazy(() => import("./pages/MentorPillarView"));
const MenteePillarPage = lazy(() => import("./pages/MenteePillarPage"));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}

// Auth redirect: after OAuth login, send user to the page they were trying to access.
function AuthRedirectHandler() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (loading || !user) return;
    const currentPath = window.location.pathname;
    if (currentPath !== "/") return;
    const returnPath = consumeReturnPath();
    if (returnPath && returnPath !== "/") {
      navigate(returnPath);
    }
  }, [user, loading, navigate]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public */}
        <Route path="/" component={Home} />
        <Route path="/acesso" component={MenteeLogin} />
        {/* OAuth callback intermediary (Safari ITP fix) */}
        <Route path="/auth/callback" component={AuthCallback} />
        {/* Mentor (protected via Manus OAuth + admin role) */}
        <Route path="/mentor" component={MentorDashboard} />
        <Route path="/mentor/novo" component={NewMentee} />
        <Route path="/mentor/importar" component={ImportData} />
        <Route path="/mentor/mentorado/:id" component={MenteeDetail} />
        {/* Mentor tools */}
        <Route path="/mentor/mentorado/:menteeId/pilar/:pillarId" component={MentorPillarView} />
        <Route path="/mentor/mentorado/:menteeId/pilar1" component={Pillar1WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/pilar2" component={Pillar2WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/pilar3" component={Pillar3WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/pilar4" component={Pillar4WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/pilar5" component={Pillar5WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/pilar6" component={Pillar6WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/pilar7" component={Pillar7WorkRoom} />
        <Route path="/mentor/mentorado/:menteeId/ivmp" component={IvmpTool} />
        <Route path="/mentor/mentorado/:menteeId/financeiro" component={FinancialDiagnostic} />
        <Route path="/mentor/mentorado/:menteeId/vendas" component={SalesTool} />
        <Route path="/mentor/mentorado/:menteeId/precificacao" component={PricingTool} />
        {/* Public — Qualificação */}
        <Route path="/qualificacao" component={Qualification} />
        {/* Mentee portal (protected via mentee cookie) */}
        <Route path="/portal" component={MenteePortal} />
        <Route path="/portal/questionario" component={MenteeQuestionnaire} />
        <Route path="/portal/pilar/:id" component={MenteePillarPage} />
        <Route path="/mentor/documentos" component={MenteeDocuments} />
        <Route path="/mentor/guia/:id" component={PillarGuide} />
        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <AuthRedirectHandler />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
