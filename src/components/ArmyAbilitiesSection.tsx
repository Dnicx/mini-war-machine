import type { Ability, Phase, Timing, TurnOwner } from '../types/roster'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'

interface ArmyAbilitiesSectionProps {
  abilities: Ability[]
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onTurnOwnerChange: (id: string, turnOwner: TurnOwner) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  onAbilityRef: (id: string, node: HTMLDivElement | null) => void
}

export function ArmyAbilitiesSection({
  abilities,
  onPhaseToggle,
  onTimingChange,
  onTurnOwnerChange,
  onNotesChange,
  onResetAbility,
  onAbilityRef
}: ArmyAbilitiesSectionProps) {

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text">Army Abilities</h2>
      {abilities.map(ability => (
        <AbilityCard
          key={ability.id}
          ability={ability}
          onPhaseToggle={onPhaseToggle}
          onTimingChange={onTimingChange}
          onTurnOwnerChange={onTurnOwnerChange}
          onNotesChange={onNotesChange}
          onResetAbility={onResetAbility}
          ref={(node) => onAbilityRef(ability.id, node)}
        />
      ))}
    </div>
  )
}

interface AbilityCardProps {
  ability: Ability
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onTurnOwnerChange: (id: string, turnOwner: TurnOwner) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  ref?: (node: HTMLDivElement | null) => void
}

function AbilityCard({ ability, onPhaseToggle, onTimingChange, onTurnOwnerChange, onNotesChange, onResetAbility, ref }: AbilityCardProps) {
  const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']
  const TIMINGS: Timing[] = ['start', 'beforeTarget', 'attacking/saving', 'afterTargeted', 'end']
  
  const currentPhases = ability.phases || []
  const currentTiming = ability.timing || ''
  const autoPhases = ability.autoDetectedPhases || []
  const hasUserOverride = JSON.stringify(ability.phases) !== JSON.stringify(ability.autoDetectedPhases) || ability.timing !== ability.autoDetectedTiming || ability.turnOwner !== ability.autoDetectedTurnOwner
  const currentTurnOwner = ability.turnOwner || ability.autoDetectedTurnOwner || 'yours'
  const hasEmptyPhases = !currentPhases || currentPhases.length === 0

  return (
    <div
      ref={ref}
      className={`bg-surface p-4 rounded-lg border-l-4 ${hasEmptyPhases ? 'border-red-500' : 'border-surface2'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-text">{ability.name}</h4>
        <div className="flex gap-2">
          {currentPhases.length > 0 && (
            <span className="text-xs bg-surface2 text-text2 px-2 py-1 rounded">{currentPhases.join(', ')}</span>
          )}
        </div>
      </div>
      {ability.sourceUnit && (
        <p className="text-text2 text-xs mb-2">{ability.sourceUnit}</p>
      )}
      <div className="mb-3 p-3 bg-surface2/50 rounded-lg">
        <SafeMarkdownRenderer content={ability.description} className="text-text2 text-sm whitespace-pre-wrap" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-text2">Phases</label>
            {hasUserOverride && (
              <button
                onClick={() => onResetAbility(ability.id)}
                className="text-xs text-accent hover:text-accent/80"
              >
                auto
              </button>
            )}
          </div>
          <div className="space-y-1">
            {PHASES.map(phase => {
              const isAutoSuggested = autoPhases.includes(phase)
              const isChecked = currentPhases.includes(phase)

              return (
                <label key={phase} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onPhaseToggle(ability.id, phase)}
                    className={isAutoSuggested ? 'accent-surface2' : 'accent-accent'}
                  />
                  <span className={isAutoSuggested ? 'text-text2' : ''}>
                    {phase}
                    {isAutoSuggested && <span className="ml-1 text-xs text-text2">(auto)</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-text2 block mb-1">Timing</label>
            <select
              value={currentTiming || ''}
              onChange={(e) => onTimingChange(ability.id, e.target.value as Timing)}
              className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Auto ({ability.autoDetectedTiming || 'None'})</option>
              {TIMINGS.map(timing => (
                <option key={timing} value={timing}>{timing}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text2 block mb-1">Turn</label>
            <select
              value={currentTurnOwner}
              onChange={(e) => onTurnOwnerChange(ability.id, e.target.value as TurnOwner)}
              className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
            >
              <option value="yours">Yours</option>
              <option value="opponent">Opponent</option>
              <option value="either">Either</option>
            </select>
          </div>
        </div>
      </div>

      <input
        type="text"
        value={ability.notes || ''}
        onChange={(e) => onNotesChange(ability.id, e.target.value)}
        placeholder="Add notes..."
        className="w-full px-3 py-1 bg-surface2 border border-surface2 rounded text-text placeholder-text2 text-sm focus:outline-none focus:border-accent"
      />
    </div>
  )
}
