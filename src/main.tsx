import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './i18n'
import './index.css'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.error("Missing Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file.")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      ) : (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          <div className="text-center p-8 border border-red-500 rounded-lg">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Configuração Necessária</h1>
            <p>Adicione sua <code>VITE_CLERK_PUBLISHABLE_KEY</code> no arquivo <code>.env</code></p>
          </div>
        </div>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
