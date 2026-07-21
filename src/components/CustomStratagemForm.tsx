import { useState } from 'react'
import { appIcon } from '../config/icons'
import { cardStyles } from '../styles/components'

const AddIcon = appIcon('add')

interface CustomStratagemFormProps {
  onAddStratagem: (name: string, description: string, cpCost: string) => void
}

export function CustomStratagemForm({ onAddStratagem }: CustomStratagemFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // Custom stratagems usually cost 0 CP, so default to that.
  const [cp, setCp] = useState('0')

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return

    // Store in the "1CP" format used by real stratagems so the badge matches.
    onAddStratagem(name, description, `${parseInt(cp) || 0}CP`)
    setName('')
    setDescription('')
    setCp('0')
  }

  return (
    <div className="mb-6 bg-surface p-4 rounded-lg">
      <h2 className="text-lg font-semibold text-text mb-3">Add Custom Stratagem</h2>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Stratagem name"
          className="w-full px-4 py-2 bg-surface2 border border-surface2 rounded text-text placeholder-text2 focus:outline-none focus:border-accent"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Stratagem description"
          rows={3}
          className="w-full px-4 py-2 bg-surface2 border border-surface2 rounded text-text placeholder-text2 focus:outline-none focus:border-accent resize-none"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-text2">CP cost</label>
          <input
            type="number"
            min={0}
            value={cp}
            onChange={(e) => setCp(e.target.value)}
            className="w-20 px-3 py-2 bg-surface2 border border-surface2 rounded text-text focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleSubmit}
          className={cardStyles.button.primary}
        >
          <AddIcon size={18} />
          Add Stratagem
        </button>
      </div>
    </div>
  )
}
