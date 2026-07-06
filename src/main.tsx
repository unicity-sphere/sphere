import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
import { ToastContainer } from './components/ui/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SphereProvider network="testnet2">
        <ServicesProvider>
          {/* UpgradeProvider MUST wrap ConnectProvider: ConnectProvider renders
              ConnectIntentHandler (and its modals, e.g. SendIntentModal →
              useTransfer → useUpgrade) as a SIBLING of children, so anything
              those modals consume has to be mounted above ConnectProvider.
              UpgradeModal itself only needs SphereProvider + react-query,
              which are both still ancestors here. */}
          <UpgradeProvider>
            <ConnectProvider>
              <ThemeInitializer>
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                  <App />
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
