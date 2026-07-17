import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'
import { initTheme } from './lib/theme'

// Apply persisted theme + typography before first paint to avoid a
// flash of the default theme.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The service worker only benefits the web build. In the native (Capacitor)
// app assets are already served locally, and the cache-first SW served a stale
// index.html that pointed at an outdated JS bundle (blank screen after update).
// So on native we never register it and actively unregister any previously
// installed SW + clear its caches to self-heal existing installs.
if (Capacitor.isNativePlatform()) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(reg => reg.unregister()))
      .catch(() => {})
  }
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key))).catch(() => {})
  }
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Service worker registered:', reg.scope))
      .catch(err => console.log('[SW] Service worker registration failed:', err))
  })
}
