import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeInitializer } from './components/theme'
import { SphereProvider } from './sdk/SphereProvider'
import { ExtensionSphereProvider } from './sdk/ExtensionSphereProvider'
import { ServicesProvider } from './contexts/ServicesProvider'
import { ConnectProvider } from './components/connect'
import { ToastContainer } from './components/ui/Toast'
import { ExtensionGate } from './components/extension/ExtensionGate'
import mixpanel from 'mixpanel-browser'

// Disable analytics in extension and mobile builds
if (import.meta.env.VITE_PLATFORM !== 'extension') {
  mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '19d06212425213a4eeb34337016d0186', {
    autocapture: true,
    record_sessions_percent: 100,
    api_host: 'https://api-eu.mixpanel.com',
  })
}

const isExtension = import.meta.env.VITE_PLATFORM === 'extension'
console.log('[main] VITE_PLATFORM:', import.meta.env.VITE_PLATFORM, 'isExtension:', isExtension)

// Use HashRouter for extension, Capacitor, or when explicitly configured
const useHashRouter = import.meta.env.VITE_HASH_ROUTER === 'true'
  || (window as unknown as Record<string, unknown>).Capacitor


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isExtension ? (
        <ExtensionSphereProvider>
          <ConnectProvider>
            <ExtensionGate>
              <ServicesProvider>
                <ThemeInitializer>
                  <HashRouter>
                    <App />
                  </HashRouter>
                  <ToastContainer />
                </ThemeInitializer>
              </ServicesProvider>
            </ExtensionGate>
          </ConnectProvider>
        </ExtensionSphereProvider>
      ) : (
        <SphereProvider network="testnet">
          <ServicesProvider>
            <ConnectProvider>
              <ThemeInitializer>
                {useHashRouter ? (
                  <HashRouter>
                    <App />
                  </HashRouter>
                ) : (
                  <BrowserRouter basename={import.meta.env.BASE_URL}>
                    <App />
                  </BrowserRouter>
                )}
                <ToastContainer />
              </ThemeInitializer>
            </ConnectProvider>
          </ServicesProvider>
        </SphereProvider>
      )}
    </QueryClientProvider>
  </StrictMode>,
)
