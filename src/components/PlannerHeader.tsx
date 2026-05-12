import { Save, Play, ChevronLeft } from 'lucide-react'

interface PlannerHeaderProps {
  onBackToImport: () => void
  onResetAll: () => void
  onSave: () => void
  onPlayMode: () => void
  saved: boolean
}

export function PlannerHeader({ onBackToImport, onResetAll, onSave, onPlayMode, saved }: PlannerHeaderProps) {
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
        <h1 className="text-2xl font-bold text-accent">Planning Mode</h1>
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
