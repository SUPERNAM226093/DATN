import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './styles/index.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          theme="dark"
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister())
      })
      .catch((error) => {
        console.error('Service Worker cleanup failed:', error)
      })

    caches.keys()
      .then((cacheNames) => {
        cacheNames
          .filter((cacheName) => cacheName.startsWith('medpro-admin-'))
          .forEach((cacheName) => caches.delete(cacheName))
      })
      .catch((error) => {
        console.error('Service Worker cache cleanup failed:', error)
      })
  })
}
