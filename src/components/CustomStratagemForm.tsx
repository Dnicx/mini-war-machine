import { useState } from 'react'
import { Plus } from 'lucide-react'

interface CustomStratagemFormProps {
  onAddStratagem: (name: string, description: string) => void
}

export function CustomStratagemForm({ onAddStratagem }: CustomStratagemFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return
    
    onAddStratagem(name, description)
    setName('')
    setDescription('')
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
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80 flex items-center gap-2"
        >
          <Plus size={18} />
          Add Stratagem
        </button>
      </div>
    </div>
  )
}
