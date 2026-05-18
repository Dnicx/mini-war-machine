import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
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

  return (
    <Routes>
      <Route path="/" element={<ImportScreen onRosterLoaded={handleRosterLoaded} />} />
      <Route
        path="/planner"
        element={roster ? (
          <Planner
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
          <PlayDashboard roster={roster} onBackToPlanner={() => navigate('/planner')} />
        ) : (
          <ImportScreen onRosterLoaded={handleRosterLoaded} />
        )}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
