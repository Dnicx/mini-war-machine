import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Ability, Phase, Timing, Keyword } from '../types/roster'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'

interface UnitAbilitiesSectionProps {
  units: Array<{
    id: string
    name: string
    abilities: Ability[]
    keywords: Keyword[]
  }>
  collapsedUnits: Set<string>
  onToggleCollapse: (unitId: string) => void
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  onAbilityRef: (id: string, node: HTMLDivElement | null) => void
}

export function UnitAbilitiesSection({
  units,
  collapsedUnits,
  onToggleCollapse,
  onPhaseToggle,
  onTimingChange,
  onNotesChange,
  onResetAbility,
  onAbilityRef
}: UnitAbilitiesSectionProps) {
  const unitsWithAbilities = units.filter(unit => unit.abilities.length > 0 || unit.keywords.length > 0)

  if (unitsWithAbilities.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text mt-6">Unit Abilities</h2>
      {unitsWithAbilities.map(unit => (
        <UnitAbilityCard
          key={unit.id}
          unitName={unit.name}
          unitId={unit.id}
          abilities={unit.abilities}
          keywords={unit.keywords}
          isCollapsed={collapsedUnits.has(unit.id)}
          onToggleCollapse={onToggleCollapse}
          onPhaseToggle={onPhaseToggle}
          onTimingChange={onTimingChange}
          onNotesChange={onNotesChange}
          onResetAbility={onResetAbility}
          onAbilityRef={onAbilityRef}
        />
      ))}
    </div>
  )
}

interface UnitAbilityCardProps {
  unitName: string
  unitId: string
  abilities: Ability[]
  keywords: Keyword[]
  isCollapsed: boolean
  onToggleCollapse: (unitId: string) => void
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  onAbilityRef: (id: string, node: HTMLDivElement | null) => void
}

function UnitAbilityCard({
  unitName,
  unitId,
  abilities,
  keywords,
  isCollapsed,
  onToggleCollapse,
  onPhaseToggle,
  onTimingChange,
  onNotesChange,
  onResetAbility,
  onAbilityRef
}: UnitAbilityCardProps) {
  const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Morale', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']
  const TIMINGS: Timing[] = ['start', 'beforeTarget', 'afterTargeted', 'end']

  return (
    <div className="bg-surface p-4 rounded-lg border-l-4 border-surface2">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onToggleCollapse(unitId)}
          className="text-md font-semibold text-text hover:text-accent transition-colors text-left"
        >
          {unitName}
        </button>
        <button
          onClick={() => onToggleCollapse(unitId)}
          className="text-text2 hover:text-accent transition-colors"
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
      {!isCollapsed && (
        <>
          {keywords.length > 0 && (
            <div className="mb-4 p-3 bg-surface2/50 rounded-lg">
              <h4 className="text-sm font-semibold text-text2 mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span key={`${keyword.id}-${index}`} className="text-xs bg-surface2 text-text2 px-2 py-1 rounded">
                    {keyword.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {abilities.map(ability => {
              const hasEmptyPhases = !ability.phases || ability.phases.length === 0
              return (
                <div
                  key={ability.id}
                  ref={(node) => onAbilityRef(ability.id, node)}
                  className={`border-b border-surface2/50 pb-4 last:border-0 last:pb-0 ${hasEmptyPhases ? 'pl-4 !border-l-4 !border-l-red-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-text">{ability.name}</h4>
                    <div className="flex gap-2">
                      {ability.isReactive && (
                        <span className="text-xs bg-yellow-600/30 text-yellow-200 px-2 py-1 rounded">Reactive</span>
                      )}
                      {(ability.phases || []).length > 0 && (
                        <span className="text-xs bg-surface2 text-text2 px-2 py-1 rounded">
                          {(ability.phases || []).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 p-3 bg-surface2/50 rounded-lg">
                    <SafeMarkdownRenderer content={ability.description} className="text-text2 text-sm whitespace-pre-wrap" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-text2">Phases</label>
                        {(JSON.stringify(ability.phases) !== JSON.stringify(ability.autoDetectedPhases) || ability.timing !== ability.autoDetectedTiming) && (
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
                          const autoPhases = ability.autoDetectedPhases || []
                          const currentPhases = ability.phases || []
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
                    <div>
                      <label className="text-xs text-text2 block mb-1">Timing</label>
                      <select
                        value={ability.timing || ability.autoDetectedTiming || ''}
                        onChange={(e) => onTimingChange(ability.id, e.target.value as Timing)}
                        className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
                      >
                        <option value="">Auto ({ability.autoDetectedTiming || 'None'})</option>
                        {TIMINGS.map(timing => (
                          <option key={timing} value={timing}>{timing}</option>
                        ))}
                      </select>
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
            })}
          </div>
        </>
      )}
    </div>
  )
}
