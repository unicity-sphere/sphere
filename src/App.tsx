import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { IntroPage } from './pages/IntroPage';
import { HomePage } from './pages/HomePage';
import { AgentPage } from './pages/AgentPage';
import { ConnectPage } from './pages/ConnectPage';
import { DesktopShell } from './components/desktop/DesktopShell';
import { useSphereEvents } from './sdk';
import { trackPageView } from './services/telemetry';
import { AnnouncementsUIProvider } from './contexts';

// Retry wrapper: auto-reload page once on chunk load failure (stale deployment)
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    importFn().catch((error) => {
      const key = 'chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(key);
      throw error;
    })
  );
}

// Lazy-load non-core pages to reduce main bundle size
const DevelopersPage = lazyWithRetry(() => import('./pages/DevelopersPage').then(m => ({ default: m.DevelopersPage })));
const DocsPage = lazyWithRetry(() => import('./pages/DocsPage').then(m => ({ default: m.DocsPage })));
const MarketsPage = lazyWithRetry(() => import('./pages/MarketsPage').then(m => ({ default: m.MarketsPage })));
const AgentsPage = lazyWithRetry(() => import('./pages/AgentsPage').then(m => ({ default: m.AgentsPage })));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ExplorePage = lazyWithRetry(() => import('./pages/ExplorePage').then(m => ({ default: m.ExplorePage })));
const ProjectPage = lazyWithRetry(() => import('./pages/ProjectPage').then(m => ({ default: m.ProjectPage })));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IntroPage />} />
      <Route path="/connect" element={<ConnectPage />} />
      <Route element={<DashboardLayout />}>
        {/* DesktopShell renders DesktopLayout once so /home <-> /agents/:id
            navigation keeps open iframe tabs mounted (see #455). */}
        <Route element={<DesktopShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/agents/:agentId" element={<AgentPage />} />
        </Route>
        <Route path="/developers" element={<Suspense fallback={<LazyFallback />}><DevelopersPage /></Suspense>} />
        <Route path="/developers/docs" element={<Suspense fallback={<LazyFallback />}><DocsPage /></Suspense>} />
        <Route path="/markets" element={<Suspense fallback={<LazyFallback />}><MarketsPage /></Suspense>} />
        <Route path="/explore-agents" element={<Suspense fallback={<LazyFallback />}><AgentsPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={<LazyFallback />}><AboutPage /></Suspense>} />
        <Route path="/explore" element={<Suspense fallback={<LazyFallback />}><ExplorePage /></Suspense>} />
        <Route path="/apps/:slug" element={<Suspense fallback={<LazyFallback />}><ProjectPage /></Suspense>} />
      </Route>
    </Routes>
  );
}

/**
 * Page views, sent to our own backend rather than to a third-party tag on this origin.
 * Keyed on pathname only: the search string is deliberately not a dependency, because
 * it must never travel and re-firing on a param change would send nothing new anyway.
 */
function usePageViewTelemetry(): void {
  const { pathname } = useLocation();
  useEffect(() => { trackPageView(pathname); }, [pathname]);
}

export default function App() {
  useSphereEvents();
  usePageViewTelemetry();
  return (
    <AnnouncementsUIProvider>
      <AppRoutes />
    </AnnouncementsUIProvider>
  );
}
