import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ImportScreen } from './components/ImportScreen'
import { Planner } from './components/Planner'
import { PlayDashboard } from './components/PlayDashboard'
import type { Roster } from './types/roster'
import { loadRoster } from './lib/storage'

function AppContent() {
  const navigate = useNavigate()
  const [roster, setRoster] = useState<Roster | null>(() => {
    const savedRoster = loadRoster()
    console.log('[App] Initial state - savedRoster:', savedRoster ? 'exists' : 'null')
    return savedRoster
  })

  const handleRosterLoaded = (newRoster: Roster) => {
    console.log('[App] handleRosterLoaded - setting roster:', newRoster.name)
    setRoster(newRoster)
    localStorage.setItem('wh40k_roster', JSON.stringify(newRoster))
    console.log('[App] Navigating to /planner')
    navigate('/planner')
  }

  const handleBackToImport = () => {
    console.log('[App] handleBackToImport - clearing roster')
    setRoster(null)
    localStorage.removeItem('wh40k_roster')
    console.log('[App] Navigating to /')
    navigate('/')
  }
 
  return (
    <Routes>
      <Route path="/" element={<ImportScreen onRosterLoaded={handleRosterLoaded} />} />
      <Route
        path="/planner"
        element={roster ? (
          <Planner
            roster={roster}
            onPlayMode={() => {
              console.log('[App] onPlayMode clicked - roster:', roster ? 'exists' : 'null')
              navigate('/play')
            }}
            onBackToImport={handleBackToImport}
          />
        ) : (
          <ImportScreen onRosterLoaded={handleRosterLoaded} />
        )}
      />
      <Route
        path="/play"
        element={roster ? (
          <PlayDashboard roster={roster} onBackToPlanner={() => {
            console.log('[App] onBackToPlanner clicked - roster:', roster ? 'exists' : 'null')
            navigate('/planner')
          }} />
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
