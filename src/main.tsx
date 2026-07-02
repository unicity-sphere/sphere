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
          <ConnectProvider>
            <UpgradeProvider>
              <ThemeInitializer>
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                  <App />
                </BrowserRouter>
                <ToastContainer />
              </ThemeInitializer>
            </UpgradeProvider>
          </ConnectProvider>
        </ServicesProvider>
      </SphereProvider>
    </QueryClientProvider>
  </StrictMode>,
)
