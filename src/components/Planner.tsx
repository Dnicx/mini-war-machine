import { useState, useEffect } from 'react'
import { Save, Plus, Play, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import type { Roster, Ability, Phase, Timing, Keyword } from '../types/roster'
import { applyHeuristicsToAll } from '../lib/phaseHeuristics'
import { savePlan, loadPlan } from '../lib/storage'

interface PlannerProps {
  roster: Roster
  onPlayMode: () => void
  onBackToImport: () => void
}

const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight', 'Morale']
const TIMINGS: Timing[] = ['start', 'beforeTarget', 'afterTargeted', 'end']

export function Planner({ roster, onPlayMode, onBackToImport }: PlannerProps) {
  const [allAbilities, setAllAbilities] = useState<Ability[]>([])
  const [customStratagems, setCustomStratagems] = useState<Ability[]>([])
  const [newStratagemName, setNewStratagemName] = useState('')
  const [newStratagemDesc, setNewStratagemDesc] = useState('')
  const [saved, setSaved] = useState(false)
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  const [debug, setDebug] = useState(false)

  useEffect(() => {
    // Load saved plan
    const savedPlan = loadPlan()
    
    // Combine all abilities from roster
    const allAbilitiesList = [
      ...roster.armyAbilities,
      ...roster.units.flatMap(unit => 
        unit.abilities.map(a => ({ ...a, sourceUnit: unit.name }))
      )
    ]
    
    // Apply heuristics
    const withHeuristics = applyHeuristicsToAll(allAbilitiesList)
    
    if (savedPlan && savedPlan.rosterId === roster.id) {
      // Override with saved plan
      const withOverrides = withHeuristics.map(ability => {
        const saved = savedPlan.phasePlans.find(p => p.abilityId === ability.id)
        if (saved) {
          return {
            ...ability,
            phases: saved.phases,
            timing: saved.timing,
            notes: saved.notes
          }
        }
        return ability
      })
      setAllAbilities(withOverrides)
      setCustomStratagems(savedPlan.customStratagems || [])
    } else {
      // Initialize phases to autoDetectedPhases by default
      const withDefaults = withHeuristics.map(ability => ({
        ...ability,
        phases: ability.autoDetectedPhases,
        timing: ability.autoDetectedTiming
      }))
      setAllAbilities(withDefaults)
    }
  }, [roster])

  const handlePhaseToggle = (abilityId: string, phase: Phase) => {
    setAllAbilities(prev => prev.map(a => {
      if (a.id !== abilityId) return a
      const currentPhases = a.phases || []
      const newPhases = currentPhases.includes(phase)
        ? currentPhases.filter(p => p !== phase)
        : [...currentPhases, phase]
      return { ...a, phases: newPhases.length > 0 ? newPhases : undefined }
    }))
    setSaved(false)
  }

  const handleTimingChange = (abilityId: string, timing: Timing) => {
    setAllAbilities(prev => prev.map(a =>
      a.id === abilityId ? { ...a, timing } : a
    ))
    setSaved(false)
  }

  const handleNotesChange = (abilityId: string, notes: string) => {
    setAllAbilities(prev => prev.map(a =>
      a.id === abilityId ? { ...a, notes } : a
    ))
    setSaved(false)
  }

  const handleResetAbility = (abilityId: string) => {
    setAllAbilities(prev => prev.map(a => {
      if (a.id !== abilityId) return a
      return {
        ...a,
        phases: a.autoDetectedPhases,
        timing: a.autoDetectedTiming
      }
    }))
    setSaved(false)
  }

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all phase selections to auto-detected values?')) {
      setAllAbilities(prev => prev.map(a => ({
        ...a,
        phases: a.autoDetectedPhases,
        timing: a.autoDetectedTiming
      })))
      setSaved(false)
    }
  }

  const handleAddStratagem = () => {
    if (!newStratagemName.trim() || !newStratagemDesc.trim()) return

    const newStratagem: Ability = {
      id: `custom-${Date.now()}`,
      name: newStratagemName,
      description: newStratagemDesc
    }

    setCustomStratagems(prev => [...prev, newStratagem])
    setNewStratagemName('')
    setNewStratagemDesc('')
    setSaved(false)
  }

  const handleDeleteStratagem = (id: string) => {
    setCustomStratagems(prev => prev.filter(s => s.id !== id))
    setSaved(false)
  }

  const handleSave = () => {
    const phasePlans = allAbilities.map(ability => ({
      abilityId: ability.id,
      phases: ability.phases || [],
      timing: ability.timing || '',
      notes: ability.notes || ''
    }))

    const plan = {
      rosterId: roster.id,
      phasePlans,
      customStratagems
    }

    savePlan(plan, debug)
    setSaved(true)
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
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
          <div className="flex gap-2">
            <button
              onClick={handleResetAll}
              className="px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80 flex items-center gap-2"
            >
              Reset All
            </button>
            <button
              onClick={handleSave}
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

        <div className="mb-6 bg-surface p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="debug"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <label htmlFor="debug" className="text-sm text-text2">Debug mode (dump plan to JSON on save)</label>
          </div>
          <h2 className="text-lg font-semibold text-text mb-3">Add Custom Stratagem</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={newStratagemName}
              onChange={(e) => setNewStratagemName(e.target.value)}
              placeholder="Stratagem name"
              className="w-full px-4 py-2 bg-surface2 border border-surface2 rounded text-text placeholder-text2 focus:outline-none focus:border-accent"
            />
            <textarea
              value={newStratagemDesc}
              onChange={(e) => setNewStratagemDesc(e.target.value)}
              placeholder="Stratagem description"
              rows={3}
              className="w-full px-4 py-2 bg-surface2 border border-surface2 rounded text-text placeholder-text2 focus:outline-none focus:border-accent resize-none"
            />
            <button
              onClick={handleAddStratagem}
              className="px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Stratagem
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Army Abilities</h2>
          {allAbilities.filter(a => !a.sourceUnit).map(ability => (
            <AbilityCard
              key={ability.id}
              ability={ability}
              onPhaseToggle={handlePhaseToggle}
              onTimingChange={handleTimingChange}
              onNotesChange={handleNotesChange}
              onResetAbility={handleResetAbility}
            />
          ))}

          <h2 className="text-lg font-semibold text-text mt-6">Unit Abilities</h2>
          {roster.units.map(unit => {
            const unitAbilities = allAbilities.filter(a => a.sourceUnit === unit.name)
            if (unitAbilities.length === 0 && unit.keywords.length === 0) return null
            return (
              <div key={unit.id} className="mb-4">
                <UnitAbilityCard
                  unitName={unit.name}
                  unitId={unit.id}
                  abilities={unitAbilities}
                  keywords={unit.keywords}
                  isCollapsed={collapsedUnits.has(unit.id)}
                  onToggleCollapse={(unitId) => {
                    setCollapsedUnits(prev => {
                      const next = new Set(prev)
                      if (next.has(unitId)) {
                        next.delete(unitId)
                      } else {
                        next.add(unitId)
                      }
                      return next
                    })
                  }}
                  onPhaseToggle={handlePhaseToggle}
                  onTimingChange={handleTimingChange}
                  onNotesChange={handleNotesChange}
                  onResetAbility={handleResetAbility}
                />
              </div>
            )
          })}

          {customStratagems.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-text mt-6">Custom Stratagems</h2>
              {customStratagems.map(stratagem => (
                <div key={stratagem.id} className="bg-surface p-4 rounded-lg border-l-4 border-accent">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-text">{stratagem.name}</h4>
                      <p className="text-text2 text-sm mt-1">{stratagem.description}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteStratagem(stratagem.id)}
                      className="ml-2 text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface AbilityCardProps {
  ability: Ability
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
}

function AbilityCard({ ability, onPhaseToggle, onTimingChange, onNotesChange, onResetAbility }: AbilityCardProps) {
  const currentPhases = ability.phases || []
  const currentTiming = ability.timing || ''
  const autoPhases = ability.autoDetectedPhases || []
  const hasUserOverride = ability.phases !== ability.autoDetectedPhases || ability.timing !== ability.autoDetectedTiming

  return (
    <div className="bg-surface p-4 rounded-lg border-l-4 border-surface2">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-text">{ability.name}</h4>
        <div className="flex gap-2">
          {ability.isReactive && (
            <span className="text-xs bg-yellow-600/30 text-yellow-200 px-2 py-1 rounded">Reactive</span>
          )}
          {currentPhases.length > 0 && (
            <span className="text-xs bg-surface2 text-text2 px-2 py-1 rounded">{currentPhases.join(', ')}</span>
          )}
        </div>
      </div>
      {ability.sourceUnit && (
        <p className="text-text2 text-xs mb-2">{ability.sourceUnit}</p>
      )}
      <div className="mb-3 p-3 bg-surface2/50 rounded-lg">
        <p className="text-text2 text-sm whitespace-pre-wrap">{ability.description}</p>
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
}

function UnitAbilityCard({ unitName, unitId, abilities, keywords, isCollapsed, onToggleCollapse, onPhaseToggle, onTimingChange, onNotesChange, onResetAbility }: UnitAbilityCardProps) {
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
            {abilities.map(ability => (
              <div key={ability.id} className="border-b border-surface2/50 pb-4 last:border-0 last:pb-0">
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
                  <p className="text-text2 text-sm whitespace-pre-wrap">{ability.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-text2">Phases</label>
                      {(ability.phases !== ability.autoDetectedPhases || ability.timing !== ability.autoDetectedTiming) && (
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
