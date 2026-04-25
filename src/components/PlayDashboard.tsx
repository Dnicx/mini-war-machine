import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Shield, Swords, ChevronDown, ChevronUp } from 'lucide-react'
import type { Roster, Phase, Timing, Ability, GameState } from '../types/roster'
import { loadPlan, saveGameState, loadGameState } from '../lib/storage'
import { applyHeuristicsToAll } from '../lib/phaseHeuristics'

interface PlayDashboardProps {
  roster: Roster
  onBackToPlanner: () => void
}

const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight', 'Morale']
const TIMINGS: Timing[] = ['start', 'beforeTarget', 'afterTargeted', 'end']
const TIMING_LABELS: Record<Timing, string> = {
  start: 'Start of Phase',
  beforeTarget: 'During Phase (Before Choosing Target)',
  afterTargeted: 'During Phase (After Being Targeted)',
  end: 'End of Phase'
}

export function PlayDashboard({ roster, onBackToPlanner }: PlayDashboardProps) {
  const [gameState, setGameState] = useState<GameState>({
    battleRound: 1,
    turnOwner: 'yours',
    currentPhase: 'Command',
    currentTiming: 'start',
    yourScore: 0,
    opponentScore: 0,
    yourCP: 5,
    opponentCP: 5,
    usedAbilities: {}
  })

  const [allAbilities, setAllAbilities] = useState<Ability[]>([])
  const [customStratagems, setCustomStratagems] = useState<Ability[]>([])
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load saved game state
    const savedState = loadGameState()
    if (savedState) {
      setGameState(savedState)
    }

    // Load plan and get abilities
    const plan = loadPlan()
    if (plan) {
      const abilities: Ability[] = [...roster.armyAbilities]
      roster.units.forEach(unit => {
        unit.abilities.forEach(ability => {
          abilities.push({
            ...ability,
            sourceUnit: unit.name
          })
        })
      })

      // Apply heuristics to get auto-detected phases
      const withHeuristics = applyHeuristicsToAll(abilities)

      // Apply plan overrides
      const withOverrides = withHeuristics.map(ability => {
        const planEntry = plan.phasePlans.find(p => p.abilityId === ability.id)
        if (planEntry) {
          return {
            ...ability,
            userPhases: [planEntry.phase],
            userTiming: planEntry.timing,
            notes: planEntry.notes
          }
        }
        // If no plan entry, use auto-detected phases as default
        return {
          ...ability,
          userPhases: ability.autoDetectedPhases
        }
      })

      setAllAbilities(withOverrides)
      setCustomStratagems(plan.customStratagems || [])
    }
  }, [roster])

  const updateGameState = (updates: Partial<GameState>) => {
    const newState = { ...gameState, ...updates }
    setGameState(newState)
    saveGameState(newState)
  }

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(gameState.currentPhase)
    const nextIndex = (currentIndex + 1) % PHASES.length
    updateGameState({ currentPhase: PHASES[nextIndex] })
  }

  const prevPhase = () => {
    const currentIndex = PHASES.indexOf(gameState.currentPhase)
    const prevIndex = (currentIndex - 1 + PHASES.length) % PHASES.length
    updateGameState({ currentPhase: PHASES[prevIndex] })
  }

  const nextTurn = () => {
    if (gameState.turnOwner === 'yours') {
      updateGameState({
        turnOwner: 'opponent',
        currentPhase: 'Command',
        currentTiming: 'start'
      })
    } else {
      // End of battle round
      const newRound = gameState.battleRound + 1
      updateGameState({
        battleRound: newRound,
        turnOwner: 'yours',
        currentPhase: 'Command',
        currentTiming: 'start',
        usedAbilities: {} // Reset once-per-battle-round abilities
      })
    }
  }

  const getActiveAbilities = () => {
    const currentPhase = gameState.currentPhase

    return [...allAbilities, ...customStratagems].filter(ability => {
      const abilityPhases = ability.userPhases || ability.autoDetectedPhases || []

      // Show if phase matches (any of the selected phases)
      // If no phases are set, show in all phases (fallback)
      const phaseMatch = abilityPhases.length === 0 || abilityPhases.includes(currentPhase)

      // For reactive abilities, show during opponent's turn
      if (ability.isReactive && gameState.turnOwner === 'opponent') {
        return phaseMatch
      }

      // For non-reactive, only show during your turn
      if (!ability.isReactive && gameState.turnOwner === 'yours') {
        return phaseMatch
      }

      return false
    })
  }

  const getAbilitiesByTiming = () => {
    const abilities = getActiveAbilities()
    const byTiming: Record<Timing, Record<string, Ability[]>> = {
      start: {},
      beforeTarget: {},
      afterTargeted: {},
      end: {}
    }

    abilities.forEach(ability => {
      const timing = ability.userTiming || ability.autoDetectedTiming
      const sourceUnit = ability.sourceUnit || 'Army Abilities'

      if (timing) {
        if (!byTiming[timing][sourceUnit]) {
          byTiming[timing][sourceUnit] = []
        }
        // Deduplicate by name within the unit
        const existing = byTiming[timing][sourceUnit].find(a => a.name === ability.name)
        if (!existing) {
          byTiming[timing][sourceUnit].push(ability)
        }
      } else {
        // If no timing specified, show in all sections
        Object.keys(byTiming).forEach(t => {
          if (!byTiming[t as Timing][sourceUnit]) {
            byTiming[t as Timing][sourceUnit] = []
          }
          // Deduplicate by name within the unit
          const existing = byTiming[t as Timing][sourceUnit].find(a => a.name === ability.name)
          if (!existing) {
            byTiming[t as Timing][sourceUnit].push(ability)
          }
        })
      }
    })

    return byTiming
  }

  const getReactiveAbilities = () => {
    if (gameState.turnOwner !== 'opponent') return {}

    const abilities = [...allAbilities, ...customStratagems].filter(ability => {
      const abilityPhases = ability.userPhases || ability.autoDetectedPhases || []
      // If no phases are set, show in all phases (fallback)
      const phaseMatch = abilityPhases.length === 0 || abilityPhases.includes(gameState.currentPhase)
      return ability.isReactive && phaseMatch
    })

    // Group by unit and deduplicate by name
    const byUnit: Record<string, Ability[]> = {}
    abilities.forEach(ability => {
      const sourceUnit = ability.sourceUnit || 'Army Abilities'
      if (!byUnit[sourceUnit]) {
        byUnit[sourceUnit] = []
      }
      // Deduplicate by name within the unit
      const existing = byUnit[sourceUnit].find(a => a.name === ability.name)
      if (!existing) {
        byUnit[sourceUnit].push(ability)
      }
    })

    return byUnit
  }

  const activeAbilities = getActiveAbilities()
  const abilitiesByTiming = getAbilitiesByTiming()
  const reactiveAbilities = getReactiveAbilities()

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBackToPlanner}
          className="text-text2 hover:text-accent flex items-center gap-1"
        >
          <ChevronLeft size={18} />
          Back to Planner
        </button>
        <h1 className="text-xl font-bold text-accent">Play Mode</h1>
        <div className="w-20" />
      </div>

      {/* Game State Header */}
      <div className="bg-surface p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="text-text2">Round {gameState.battleRound}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              gameState.turnOwner === 'yours' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}>
              {gameState.turnOwner === 'yours' ? 'Your Turn' : "Opponent's Turn"}
            </span>
          </div>
          <button
            onClick={nextTurn}
            className="px-3 py-1 bg-surface2 text-text rounded hover:bg-surface2/80 text-sm"
          >
            Next Turn
          </button>
        </div>

        {/* Phase Navigation */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={prevPhase}
            className="p-1 text-text2 hover:text-accent"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 flex justify-center">
            {PHASES.map(phase => (
              <button
                key={phase}
                onClick={() => updateGameState({ currentPhase: phase })}
                className={`px-3 py-1 mx-1 rounded text-sm ${
                  gameState.currentPhase === phase
                    ? 'bg-accent text-white'
                    : 'bg-surface2 text-text hover:bg-surface2/80'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
          <button
            onClick={nextPhase}
            className="p-1 text-text2 hover:text-accent"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Score & CP Tracker */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-text2 mb-2">Your Score</h3>
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateGameState({ yourScore: Math.max(0, gameState.yourScore - 1) })}
              className="w-8 h-8 bg-surface2 rounded text-text hover:bg-surface2/80"
            >
              -
            </button>
            <span className="text-2xl font-bold text-accent">{gameState.yourScore}</span>
            <button
              onClick={() => updateGameState({ yourScore: gameState.yourScore + 1 })}
              className="w-8 h-8 bg-surface2 rounded text-text hover:bg-surface2/80"
            >
              +
            </button>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-text2 mb-2">Your CP</h3>
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateGameState({ yourCP: Math.max(0, gameState.yourCP - 1) })}
              className="w-8 h-8 bg-surface2 rounded text-text hover:bg-surface2/80"
            >
              -
            </button>
            <span className="text-2xl font-bold text-accent">{gameState.yourCP}</span>
            <button
              onClick={() => updateGameState({ yourCP: gameState.yourCP + 1 })}
              className="w-8 h-8 bg-surface2 rounded text-text hover:bg-surface2/80"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Reactive Panel (Opponent's Turn) */}
      {gameState.turnOwner === 'opponent' && Object.keys(reactiveAbilities).length > 0 && (
        <div className="bg-surface2 p-4 rounded-lg mb-4 border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="text-yellow-500" size={20} />
            <h3 className="font-semibold text-text">Reactive Abilities</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(reactiveAbilities).map(([unitName, abilities]) => (
              <CollapsibleUnitSection
                key={unitName}
                unitName={unitName}
                abilities={abilities}
                isCollapsed={collapsedUnits.has(unitName)}
                onToggle={() => {
                  setCollapsedUnits(prev => {
                    const next = new Set(prev)
                    if (next.has(unitName)) {
                      next.delete(unitName)
                    } else {
                      next.add(unitName)
                    }
                    return next
                  })
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Abilities Panel - Grouped by Timing */}
      {gameState.turnOwner === 'yours' && gameState.currentPhase !== 'Start of Game' && gameState.currentPhase !== 'Start of Battle Round' ? (
        <div className="space-y-4">
          {TIMINGS.map(timing => (
            <div key={timing} className="bg-surface p-4 rounded-lg">
              <h3 className="font-semibold text-text mb-3">{TIMING_LABELS[timing]}</h3>
              <div className="space-y-4">
                {Object.keys(abilitiesByTiming[timing]).length === 0 ? (
                  <p className="text-text2 text-center py-4 text-sm">No abilities for this timing</p>
                ) : (
                  Object.entries(abilitiesByTiming[timing]).map(([unitName, abilities]) => (
                    <CollapsibleUnitSection
                      key={unitName}
                      unitName={unitName}
                      abilities={abilities}
                      isCollapsed={collapsedUnits.has(unitName)}
                      onToggle={() => {
                        setCollapsedUnits(prev => {
                          const next = new Set(prev)
                          if (next.has(unitName)) {
                            next.delete(unitName)
                          } else {
                            next.add(unitName)
                          }
                          return next
                        })
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="text-accent" size={20} />
            <h3 className="font-semibold text-text">
              {gameState.turnOwner === 'yours' ? 'Active Abilities' : 'Opponent Phase'}
            </h3>
          </div>
          <div className="space-y-2">
            {activeAbilities.length === 0 ? (
              <p className="text-text2 text-center py-4">No abilities for this phase</p>
            ) : (
              activeAbilities.map(ability => (
                <PlayAbilityCard
                  key={ability.id}
                  ability={ability}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface PlayAbilityCardProps {
  ability: Ability
}

function PlayAbilityCard({ ability }: PlayAbilityCardProps) {
  return (
    <div className="p-3 rounded-lg border-l-4 bg-surface2 border-accent">
      <div className="flex-1">
        <h4 className="font-semibold text-text">{ability.name}</h4>
        {ability.sourceUnit && (
          <p className="text-text2 text-xs">{ability.sourceUnit}</p>
        )}
        <p className="text-text2 text-sm mt-1 whitespace-pre-wrap">{ability.description}</p>
        {ability.notes && (
          <p className="text-accent text-xs mt-1 italic">Note: {ability.notes}</p>
        )}
      </div>
    </div>
  )
}

interface CollapsibleUnitSectionProps {
  unitName: string
  abilities: Ability[]
  isCollapsed: boolean
  onToggle: () => void
}

function CollapsibleUnitSection({ unitName, abilities, isCollapsed, onToggle }: CollapsibleUnitSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-semibold text-accent mb-2 hover:text-accent/80 transition-colors"
      >
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        {unitName}
      </button>
      {!isCollapsed && (
        <div className="space-y-2 ml-6">
          {abilities.map(ability => (
            <PlayAbilityCard
              key={ability.id}
              ability={ability}
            />
          ))}
        </div>
      )}
    </div>
  )
}
