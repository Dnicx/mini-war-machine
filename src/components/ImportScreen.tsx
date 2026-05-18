import { useState, useRef } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import type { Roster, RosterMeta } from '../types/roster'
import { parseRosFile } from '../lib/parseRos'
import { loadRostersIndex, loadRosterById, deleteRosterFromLibrary } from '../lib/storage'

interface ImportScreenProps {
  onRosterLoaded: (roster: Roster) => void
}

export function ImportScreen({ onRosterLoaded }: ImportScreenProps) {
  const [rosters, setRosters] = useState<RosterMeta[]>(() =>
    loadRostersIndex().sort((a, b) => b.lastUsed - a.lastUsed)
  )
  const [pendingRoster, setPendingRoster] = useState<Roster | null>(null)
  const [rosterName, setRosterName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    setLoading(true)
    setError('')

    try {
      const roster = await parseRosFile(file, debug)
      setPendingRoster(roster)
      setRosterName(roster.name)
    } catch (err) {
      console.error(err)
      setError(`Failed to parse .ros file. Make sure it's a valid BattleScribe roster. "${err}"`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = () => {
    if (!pendingRoster) return
    const named = { ...pendingRoster, name: rosterName.trim() || pendingRoster.name }
    onRosterLoaded(named)
  }

  const handleLoadRoster = (meta: RosterMeta) => {
    const roster = loadRosterById(meta.id)
    if (!roster) {
      setError(`Roster "${meta.name}" could not be loaded.`)
      return
    }
    onRosterLoaded(roster)
  }

  const handleDeleteRoster = (id: string) => {
    deleteRosterFromLibrary(id)
    setRosters(loadRostersIndex().sort((a, b) => b.lastUsed - a.lastUsed))
    setConfirmDeleteId(null)
  }

  if (pendingRoster) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-accent mb-2">WH40K Companion</h1>
            <p className="text-text2">Name your roster</p>
          </div>

          <div className="bg-surface p-6 rounded-lg space-y-4">
            <div>
              <label className="block text-sm text-text2 mb-1">Roster name</label>
              <input
                type="text"
                value={rosterName}
                onChange={e => setRosterName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmImport()}
                className="w-full px-3 py-2 bg-surface2 rounded text-text border border-surface2 focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <p className="text-text2 text-xs">
              {pendingRoster.faction} · {pendingRoster.detachment} · {pendingRoster.points} pts
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingRoster(null)}
                className="flex-1 px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-2 bg-accent text-white rounded hover:bg-accent/80"
              >
                Save Roster
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-accent mb-2">WH40K Companion</h1>
          <p className="text-text2">
            {rosters.length > 0 ? 'Select an army roster' : 'Import your army roster to get started'}
          </p>
        </div>

        {rosters.length > 0 && (
          <div className="bg-surface rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-surface2">
              <h2 className="text-xs font-semibold text-text2 uppercase tracking-wider">Saved Rosters</h2>
            </div>
            <ul className="divide-y divide-surface2">
              {rosters.map(meta => (
                <li
                  key={meta.id}
                  onClick={() => handleLoadRoster(meta)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface2/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-medium truncate">{meta.name}</p>
                    <p className="text-text2 text-xs truncate">
                      {meta.faction} · {meta.detachment} · {meta.points} pts
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {confirmDeleteId === meta.id ? (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteRoster(meta.id) }}
                          className="px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-600"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          className="px-2 py-1 bg-surface2 text-text2 rounded text-sm hover:bg-surface2/80"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(meta.id) }}
                        className="p-1 text-text2 hover:text-red-400 rounded"
                        title="Delete roster"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="block w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ros,.txt,application/octet-stream,*/*"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <div className="w-full px-4 py-8 bg-surface border-2 border-dashed border-surface2 rounded text-center cursor-pointer hover:border-accent transition-colors">
            <Upload className="mx-auto mb-2 text-text2" size={32} />
            <p className="text-text font-medium text-sm">
              {loading ? 'Importing…' : 'Add New Roster'}
            </p>
            <p className="text-text2 text-xs mt-1">Click to upload a .ros file</p>
          </div>
        </label>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="debug"
            checked={debug}
            onChange={e => setDebug(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <label htmlFor="debug" className="text-sm text-text2">Debug mode (dump parsed roster to JSON)</label>
        </div>
      </div>
    </div>
  )
}
