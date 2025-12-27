import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function enableMocking() {
  // Only enable MSW in development when VITE_USE_MOCKS is true
  // Set VITE_USE_MOCKS=false to use real backend API
  const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

  if (import.meta.env.DEV && useMocks) {
    console.log('[MSW] Mocking enabled - using mock API handlers')
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
    })
  }

  if (import.meta.env.DEV && !useMocks) {
    console.log('[API] Using real backend at /api (proxied to localhost:8000)')
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
