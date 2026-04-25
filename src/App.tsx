import { useState, useEffect } from 'react'
import { ImportScreen } from './components/ImportScreen'
import { Planner } from './components/Planner'
import { PlayDashboard } from './components/PlayDashboard'
import type { Roster } from './types/roster'
import { loadRoster } from './lib/storage'

type Screen = 'import' | 'planner' | 'play'

function App() {
  const [screen, setScreen] = useState<Screen>('import')
  const [roster, setRoster] = useState<Roster | null>(null)

  useEffect(() => {
    // Load saved roster on mount
    const savedRoster = loadRoster()
    if (savedRoster) {
      setRoster(savedRoster)
      setScreen('planner')
    }
  }, [])

  const handleRosterLoaded = (newRoster: Roster) => {
    setRoster(newRoster)
    localStorage.setItem('wh40k_roster', JSON.stringify(newRoster))
    setScreen('planner')
  }

  if (!roster) {
    return <ImportScreen onRosterLoaded={handleRosterLoaded} />
  }

  if (screen === 'planner') {
    return <Planner roster={roster} onPlayMode={() => setScreen('play')} onBackToImport={() => {
      setRoster(null)
      setScreen('import')
      localStorage.removeItem('wh40k_roster')
    }} />
  }

  if (screen === 'play') {
    return <PlayDashboard roster={roster} onBackToPlanner={() => setScreen('planner')} />
  }

  return null
}

export default App
