import type { Ability, Phase, Timing, TurnOwner } from '../types/roster'
import { TIMINGS, TIMING_LABELS } from '../lib/timing'
import { effectiveTurnOwner } from '../lib/turnOwnerHeuristics'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'

// Same phase set and order as the auto-detected ability cards.
const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']

interface CustomStratagemsSectionProps {
  customStratagems: Ability[]
  onDeleteStratagem: (id: string) => void
  onUpdateStratagem: (id: string, patch: Partial<Ability>) => void
}

export function CustomStratagemsSection({ customStratagems, onDeleteStratagem, onUpdateStratagem }: CustomStratagemsSectionProps) {
  if (customStratagems.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text mt-6">Custom Stratagems</h2>
      {customStratagems.map(stratagem => (
        <CustomStratagemCard
          key={stratagem.id}
          stratagem={stratagem}
          onDelete={onDeleteStratagem}
          onUpdate={onUpdateStratagem}
        />
      ))}
    </div>
  )
}

interface CustomStratagemCardProps {
  stratagem: Ability
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Ability>) => void
}

function CustomStratagemCard({ stratagem, onDelete, onUpdate }: CustomStratagemCardProps) {
  const currentPhases = stratagem.phases || []
  // Custom stratagems have no auto-detection, so an empty phase list is a
  // reminder that shows in every phase — flag it like the ability cards do.
  const hasEmptyPhases = currentPhases.length === 0
  // cpCost is stored as "0CP"/"1CP"; strip to the number for the input.
  const cpValue = parseInt(stratagem.cpCost || '') || 0

  const togglePhase = (phase: Phase) => {
    const next = currentPhases.includes(phase)
      ? currentPhases.filter(p => p !== phase)
      : [...currentPhases, phase]
    onUpdate(stratagem.id, { phases: next.length > 0 ? next : undefined })
  }

  return (
    <div className={`bg-surface p-4 rounded-lg border-l-4 ${hasEmptyPhases ? 'border-red-500' : 'border-accent'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-text">{stratagem.name}</h4>
        <button
          onClick={() => onDelete(stratagem.id)}
          className="ml-2 text-red-400 hover:text-red-300 text-sm"
        >
          Delete
        </button>
      </div>
      <div className="mb-3 p-3 bg-surface2/50 rounded-lg">
        <SafeMarkdownRenderer content={stratagem.description} className="text-text2 text-sm whitespace-pre-wrap" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-text2 block mb-1">Phases</label>
          <div className="space-y-1">
            {PHASES.map(phase => (
              <label key={phase} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={currentPhases.includes(phase)}
                  onChange={() => togglePhase(phase)}
                  className="accent-accent"
                />
                <span>{phase}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-text2 block mb-1">Timing</label>
            <select
              value={stratagem.timing || ''}
              onChange={(e) => onUpdate(stratagem.id, { timing: (e.target.value || undefined) as Timing })}
              className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All timings</option>
              {TIMINGS.map(timing => (
                <option key={timing} value={timing}>{TIMING_LABELS[timing]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text2 block mb-1">Turn</label>
            <select
              value={effectiveTurnOwner(stratagem)}
              onChange={(e) => onUpdate(stratagem.id, { turnOwner: e.target.value as TurnOwner })}
              className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
            >
              <option value="yours">Yours</option>
              <option value="opponent">Opponent</option>
              <option value="either">Either</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text2 block mb-1">CP cost</label>
            <input
              type="number"
              min={0}
              value={cpValue}
              onChange={(e) => onUpdate(stratagem.id, { cpCost: `${parseInt(e.target.value) || 0}CP` })}
              className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      <input
        type="text"
        value={stratagem.notes || ''}
        onChange={(e) => onUpdate(stratagem.id, { notes: e.target.value })}
        placeholder="Add notes..."
        className="w-full px-3 py-1 bg-surface2 border border-surface2 rounded text-text placeholder-text2 text-sm focus:outline-none focus:border-accent"
      />
    </div>
  )
}
