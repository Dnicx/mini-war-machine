import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ImportScreen } from './components/ImportScreen'
import { Planner } from './components/Planner'
import { PlayDashboard } from './components/PlayDashboard'
import type { Roster } from './types/roster'
import {
  getActiveRosterId,
  loadRosterById,
  saveRosterToLibrary,
  setActiveRosterId,
  clearActiveRosterId,
  renameRoster,
} from './lib/storage'

function AppContent() {
  const navigate = useNavigate()
  const [roster, setRoster] = useState<Roster | null>(() => {
    const activeId = getActiveRosterId()
    if (!activeId) return null
    return loadRosterById(activeId)
  })

  const handleRosterLoaded = (newRoster: Roster) => {
    saveRosterToLibrary(newRoster)
    setActiveRosterId(newRoster.id)
    setRoster(newRoster)
    navigate('/planner')
  }

  const handleBackToImport = () => {
    setRoster(null)
    clearActiveRosterId()
    navigate('/')
  }

  const handleRosterRenamed = (newName: string) => {
    if (!roster) return
    renameRoster(roster.id, newName)
    setRoster({ ...roster, name: newName })
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    // handle mobile "backButotn" logic
    const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        CapApp.exitApp()
      }
    })
    return () => { listenerPromise.then(l => l.remove()) }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<ImportScreen onRosterLoaded={handleRosterLoaded} />} />
      <Route
        path="/planner"
        element={roster ? (
          <Planner
            key={roster.id}
            roster={roster}
            onPlayMode={() => navigate('/play')}
            onBackToImport={handleBackToImport}
            onRosterRenamed={handleRosterRenamed}
          />
        ) : (
          <ImportScreen onRosterLoaded={handleRosterLoaded} />
        )}
      />
      <Route
        path="/play"
        element={roster ? (
          <PlayDashboard key={roster.id} roster={roster} onBackToPlanner={() => navigate('/planner')} />
        ) : (
          <ImportScreen onRosterLoaded={handleRosterLoaded} />
        )}
      />
    </Routes>
  )
}

// BASE_URL comes from Vite's `base` and ends with "/" (e.g. "/mini-war-machine/"). The router
// would then not match "/mini-war-machine" without the slash, so strip it. Root "/" is kept.
const routerBasename = import.meta.env.BASE_URL.replace(/(.)\/$/, '$1')

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
