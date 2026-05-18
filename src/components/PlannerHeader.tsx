import { useState } from 'react'
import { Save, Play, ChevronLeft, Pencil, Check, X } from 'lucide-react'

interface PlannerHeaderProps {
  onBackToImport: () => void
  onResetAll: () => void
  onSave: () => void
  onPlayMode: () => void
  saved: boolean
  rosterName: string
  onRosterRenamed: (newName: string) => void
}

export function PlannerHeader({ onBackToImport, onResetAll, onSave, onPlayMode, saved, rosterName, onRosterRenamed }: PlannerHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(rosterName)
    setEditing(true)
  }

  const commitEdit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== rosterName) {
      onRosterRenamed(trimmed)
    }
    setEditing(false)
  }

  const cancelEdit = () => setEditing(false)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToImport}
          className="text-text2 hover:text-accent flex items-center gap-1"
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit()
                  if (e.key === 'Escape') cancelEdit()
                }}
                className="text-xl font-bold bg-surface2 text-accent rounded px-2 py-0.5 border border-accent focus:outline-none"
                autoFocus
              />
              <button onClick={commitEdit} className="text-green-400 hover:text-green-300">
                <Check size={16} />
              </button>
              <button onClick={cancelEdit} className="text-text2 hover:text-text">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-accent">{rosterName}</h1>
              <button
                onClick={startEdit}
                className="text-text2 hover:text-accent"
                title="Rename roster"
              >
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onResetAll}
          className="px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80 flex items-center gap-2"
        >
          Reset All
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80 flex items-center gap-2"
        >
          <Save size={18} />
          {saved ? 'Saved' : 'Save Plan'}
        </button>
        <button
          onClick={onPlayMode}
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2"
        >
          <Play size={18} />
          Play Mode
        </button>
      </div>
    </div>
  )
}
