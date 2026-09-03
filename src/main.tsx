import './instrument' // must stay first: Sentry initializes before app modules load
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import '@unicitylabs/sphere-ui/styles'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeInitializer } from './components/theme'
import { SphereProvider } from './sdk/SphereProvider'
import { ServicesProvider } from './contexts/ServicesProvider'
import { ConnectProvider } from './components/connect'
import { UpgradeProvider } from './components/upgrade'
import { SPHERE_NETWORK } from './config/network'
import { ToastContainer } from './components/ui/Toast'
import { ErrorFallback } from './components/ui/ErrorFallback'

createRoot(document.getElementById('root')!, {
  // React 19 root hooks: report errors that crash above the ErrorBoundary
  // (provider tree) and recoverable render errors. The console.error callback
  // replaces React's default logging, which these hooks suppress — without it,
  // dev builds (Sentry disabled) would swallow errors silently.
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.error('Uncaught error in React root:', error, errorInfo.componentStack)
  }),
  onRecoverableError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.error('Recoverable React error:', error, errorInfo.componentStack)
  }),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SphereProvider network={SPHERE_NETWORK}>
        <ServicesProvider>
          {/* UpgradeProvider MUST wrap ConnectProvider: ConnectProvider renders
              ConnectIntentHandler (and its modals, e.g. SendIntentModal →
              useTransfer → useUpgrade) as a SIBLING of children, so anything
              those modals consume has to be mounted above ConnectProvider.
              PlanScreen itself only needs SphereProvider + react-query,
              which are both still ancestors here. */}
          <UpgradeProvider>
            <ConnectProvider>
              <ThemeInitializer>
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
                    <App />
                  </Sentry.ErrorBoundary>
                </BrowserRouter>
                <ToastContainer />
              </ThemeInitializer>
            </ConnectProvider>
          </UpgradeProvider>
        </ServicesProvider>
      </SphereProvider>
    </QueryClientProvider>
  </StrictMode>,
)
