import { useState } from 'react'
import { Upload, Download } from 'lucide-react'
import type { Roster } from '../types/roster'
import { parseRosFile, fetchFromYellowscribe } from '../lib/parseRos'

interface ImportScreenProps {
  onRosterLoaded: (roster: Roster) => void
}

export function ImportScreen({ onRosterLoaded }: ImportScreenProps) {
  const [yellowscribeId, setYellowscribeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState(false)

  const handleYellowscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!yellowscribeId.trim()) return

    setLoading(true)
    setError('')

    try {
      const roster = await fetchFromYellowscribe(yellowscribeId.trim(), debug)
      onRosterLoaded(roster)
    } catch (err) {
      setError('Failed to fetch roster. Check the ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      console.log( 'importing ')
      const roster = await parseRosFile(file, debug)
      onRosterLoaded(roster)
    } catch (err) {
      console.error(err)
      setError('Failed to parse .ros file. Make sure it\'s a valid BattleScribe roster.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-accent mb-2">WH40K Companion</h1>
          <p className="text-text2">Import your army roster to get started</p>
        </div>

        <div className="bg-surface p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="debug"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <label htmlFor="debug" className="text-sm text-text2">Debug mode (dump parsed roster to JSON)</label>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
              <Download size={20} />
              Import from Yellowscribe
            </h2>
            <form onSubmit={handleYellowscribeSubmit} className="space-y-3">
              <input
                type="text"
                value={yellowscribeId}
                onChange={(e) => setYellowscribeId(e.target.value)}
                placeholder="Enter Yellowscribe ID"
                className="w-full px-4 py-2 bg-surface2 border border-surface2 rounded text-text placeholder-text2 focus:outline-none focus:border-accent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !yellowscribeId.trim()}
                className="w-full px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Import'}
              </button>
            </form>
          </div>

          <div className="border-t border-surface2 pt-4">
            <h2 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
              <Upload size={20} />
              Upload .ros File
            </h2>
            <label className="block w-full">
              <input
                type="file"
                accept=".ros"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
              <div className="w-full px-4 py-8 bg-surface2 border-2 border-dashed border-surface2 rounded text-center cursor-pointer hover:border-accent transition-colors">
                <Upload className="mx-auto mb-2 text-text2" size={32} />
                <p className="text-text2 text-sm">Click to upload or drag and drop</p>
                <p className="text-text2 text-xs mt-1">.ros files only</p>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
