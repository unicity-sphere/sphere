import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeInitializer } from './components/theme'
import { SphereProvider } from './sdk/SphereProvider'
import { ServicesProvider } from './contexts/ServicesProvider'
import { ConnectProvider } from './components/connect'
import { ToastContainer } from './components/ui/Toast'
import { registerTelcoServiceWorker } from './components/chat/telco/serviceWorkerManager'
import mixpanel from 'mixpanel-browser'
mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '19d06212425213a4eeb34337016d0186', {
  autocapture: true,
  record_sessions_percent: 100,
  api_host: 'https://api-eu.mixpanel.com',
})

// Register the telco service worker as early as possible. Two reasons:
// (1) Chrome only fires the "Install Sphere" install prompt once a SW with a
//     fetch handler is active — registering at app start (rather than waiting
//     for the user to enter a chat) makes the app installable immediately.
// (2) The SW also handles incoming-call notifications with Accept/Decline
//     action buttons, so we want it active before the first call.
registerTelcoServiceWorker()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SphereProvider network="testnet">
        <ServicesProvider>
          <ConnectProvider>
            <ThemeInitializer>
              <BrowserRouter basename={import.meta.env.BASE_URL}>
                <App />
              </BrowserRouter>
              <ToastContainer />
            </ThemeInitializer>
          </ConnectProvider>
        </ServicesProvider>
      </SphereProvider>
    </QueryClientProvider>
  </StrictMode>,
)
