import type { Ability } from '../types/roster'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'

interface CustomStratagemsSectionProps {
  customStratagems: Ability[]
  onDeleteStratagem: (id: string) => void
}

export function CustomStratagemsSection({ customStratagems, onDeleteStratagem }: CustomStratagemsSectionProps) {
  if (customStratagems.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text mt-6">Custom Stratagems</h2>
      {customStratagems.map(stratagem => (
        <div key={stratagem.id} className="bg-surface p-4 rounded-lg border-l-4 border-accent">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-text">{stratagem.name}</h4>
              <SafeMarkdownRenderer content={stratagem.description} className="text-text2 text-sm mt-1" />
            </div>
            <button
              onClick={() => onDeleteStratagem(stratagem.id)}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
