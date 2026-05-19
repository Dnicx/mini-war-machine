import { useState, useEffect, useRef } from 'react'
import { useSwipe } from '../hooks/useSwipe'
import { ChevronLeft, ChevronRight, Shield, Swords, ChevronDown, ChevronUp, Users } from 'lucide-react'
import type { Roster, Phase, Timing, Ability, GameState, Stratagem, TurnOwner } from '../types/roster'
import { loadPlan, saveGameState, loadGameState, loadUnitImages, saveUnitImages } from '../lib/storage'
import { applyHeuristicsToAll } from '../lib/phaseHeuristics'
import { getCoreStratagems, getDetachmentStratagems } from '../lib/stratagemRegistry'
import { getStratagemFolderName } from '../lib/factionMapping'
import { PlayAbilityCard } from './PlayAbilityCard'
import { UnitView } from './UnitView'

interface PlayDashboardProps {
  roster: Roster
  onBackToPlanner: () => void
}

const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']
const TIMINGS: Timing[] = ['start', 'beforeTarget', 'attacking', 'afterTargeted', 'end']
const TIMING_LABELS: Record<Timing, string> = {
  start: 'Start of Phase',
  beforeTarget: 'During Phase (Before Choosing Target)',
  attacking: 'During Attack (Dice Rolls)',
  afterTargeted: 'During Phase (After Being Targeted)',
  end: 'End of Phase'
}

export function PlayDashboard({ roster, onBackToPlanner }: PlayDashboardProps) {
  const [gameState, setGameState] = useState<GameState>(() => loadGameState() ?? {
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
  const [coreStratagems, setCoreStratagems] = useState<Stratagem[]>([])
  const [detachmentStratagems, setDetachmentStratagems] = useState<Stratagem[]>([])
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'phase' | 'unit'>('phase')
  const [unitImages, setUnitImages] = useState<Record<string, string>>(() => loadUnitImages())
  const [animDir, setAnimDir] = useState<'left' | 'right'>('right')
  const [exitingPhase, setExitingPhase] = useState<Phase | null>(null)
  const [activeTiming, setActiveTiming] = useState<Timing>('start')

  useEffect(() => {
    // Load plan and get abilities
    const plan = loadPlan(roster.id)
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
            phases: planEntry.phases,
            timing: planEntry.timing,
            notes: planEntry.notes
          }
        }
        // If no plan entry, use auto-detected phases as default
        return {
          ...ability,
          phases: ability.autoDetectedPhases
        }
      })

      // eslint-disable-next-line react-hooks/set-state-in-effect -- batch init from persisted storage
      setAllAbilities(withOverrides)
      setCustomStratagems(plan.customStratagems || [])

      // Load core stratagems
      const coreStrats = getCoreStratagems()
      const coreOverrides = coreStrats.map(strat => {
        const saved = plan.corePhasePlans?.find(p => p.abilityId === strat.id)
        if (saved) {
          return {
            ...strat,
            phases: saved.phases,
            timing: saved.timing,
            turnOwner: saved.turnOwner,
            enabled: saved.enabled ?? true
          }
        }
        return strat
      })
      setCoreStratagems(coreOverrides)

      // Load detachment stratagems if selected
      if (plan.selectedDetachment) {
        const factionFolder = getStratagemFolderName(roster.faction)
        if (factionFolder) {
          const detachmentStrats = getDetachmentStratagems(factionFolder, plan.selectedDetachment)
          const detachmentOverrides = detachmentStrats.map(strat => {
            const saved = plan.detachmentPhasePlans?.find(p => p.abilityId === strat.id)
            if (saved) {
              return {
                ...strat,
                phases: saved.phases,
                timing: saved.timing,
                turnOwner: saved.turnOwner
              }
            }
            return strat
          })
          setDetachmentStratagems(detachmentOverrides)
        }
      }
    }
  }, [roster])

  const updateGameState = (updates: Partial<GameState>) => {
    const newState = { ...gameState, ...updates }
    setGameState(newState)
    saveGameState(newState)
  }

  const toggleUnit = (unitName: string) => {
    setCollapsedUnits(prev => {
      const next = new Set(prev)
      if (next.has(unitName)) next.delete(unitName)
      else next.add(unitName)
      return next
    })
  }

  const nextPhase = () => {
    if (exitingPhase) return
    const currentIndex = PHASES.indexOf(gameState.currentPhase)
    const nextIndex = (currentIndex + 1) % PHASES.length
    setAnimDir('right')
    setExitingPhase(gameState.currentPhase)
    setActiveTiming('start')
    updateGameState({ currentPhase: PHASES[nextIndex] })
    setTimeout(() => setExitingPhase(null), 300)
  }

  const prevPhase = () => {
    if (exitingPhase) return
    const currentIndex = PHASES.indexOf(gameState.currentPhase)
    const prevIndex = (currentIndex - 1 + PHASES.length) % PHASES.length
    setAnimDir('left')
    setExitingPhase(gameState.currentPhase)
    setActiveTiming('start')
    updateGameState({ currentPhase: PHASES[prevIndex] })
    setTimeout(() => setExitingPhase(null), 300)
  }

  const swipeHandlers = useSwipe(nextPhase, prevPhase)

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

  const getActiveAbilities = (phase: Phase, turnOwner: TurnOwner) => {
    // Filter core stratagems (only enabled ones)
    const enabledCoreStrats = coreStratagems.filter(s => s.enabled !== false)

    // Combine all abilities and stratagems
    const allItems = [...allAbilities, ...customStratagems, ...enabledCoreStrats, ...detachmentStratagems]

    return allItems.filter(ability => {
      const abilityPhases = ability.phases || ability.autoDetectedPhases || []

      // Show if phase matches (any of the selected phases)
      // If no phases are set, show in all phases (fallback)
      const phaseMatch = abilityPhases.length === 0 || abilityPhases.includes(phase)

      // For stratagems, check turn owner
      if ('turnOwner' in ability) {
        const stratagemTurnOwner = (ability as Stratagem).turnOwner || (ability as Stratagem).autoDetectedTurnOwner || 'yours'

        // Show if turn owner matches current turn
        if (stratagemTurnOwner === 'either') {
          return phaseMatch
        }
        if (stratagemTurnOwner === 'yours' && turnOwner === 'yours') {
          return phaseMatch
        }
        if (stratagemTurnOwner === 'opponent' && turnOwner === 'opponent') {
          return phaseMatch
        }
        return false
      }

      // For reactive abilities, show during opponent's turn
      if (ability.isReactive && turnOwner === 'opponent') {
        return phaseMatch
      }

      // For non-reactive, only show during your turn
      if (!ability.isReactive && turnOwner === 'yours') {
        return phaseMatch
      }

      return false
    })
  }

  const getAbilitiesByTiming = (phase: Phase, turnOwner: TurnOwner) => {
    const abilities = getActiveAbilities(phase, turnOwner)
    const byTiming: Record<Timing, Record<string, Ability[]>> = {
      start: {},
      beforeTarget: {},
      attacking: {},
      afterTargeted: {},
      end: {}
    }

    abilities.forEach(ability => {
      const timing = ability.timing || ability.autoDetectedTiming
      // For stratagems, use "Stratagems" as the source unit
      const sourceUnit = 'turnOwner' in ability ? 'Stratagems' : (ability.sourceUnit || 'Army Abilities')

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

  const getReactiveAbilities = (phase: Phase, turnOwner: TurnOwner) => {
    if (turnOwner !== 'opponent') return {}

    // Filter core stratagems (only enabled ones)
    const enabledCoreStrats = coreStratagems.filter(s => s.enabled !== false)

    const abilities = [...allAbilities, ...customStratagems, ...enabledCoreStrats, ...detachmentStratagems].filter(ability => {
      const abilityPhases = ability.phases || ability.autoDetectedPhases || []
      // If no phases are set, show in all phases (fallback)
      const phaseMatch = abilityPhases.length === 0 || abilityPhases.includes(phase)

      // For stratagems, check if they can be used on opponent's turn
      if ('turnOwner' in ability) {
        const stratagemTurnOwner = (ability as Stratagem).turnOwner || (ability as Stratagem).autoDetectedTurnOwner || 'yours'
        // Show if turn owner is 'either' or 'opponent'
        if (stratagemTurnOwner === 'either' || stratagemTurnOwner === 'opponent') {
          return phaseMatch
        }
        return false
      }

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

  const activeAbilities = getActiveAbilities(gameState.currentPhase, gameState.turnOwner)
  const abilitiesByTiming = getAbilitiesByTiming(gameState.currentPhase, gameState.turnOwner)
  const reactiveAbilities = getReactiveAbilities(gameState.currentPhase, gameState.turnOwner)

  const handleImagesChange = (images: Record<string, string>) => {
    setUnitImages(images)
    saveUnitImages(images)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-16" style={{ touchAction: 'pan-y' }} {...(activeTab === 'phase' ? swipeHandlers : {})}>
      {/* Header — always visible */}
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

      {/* Phase View content — hidden in Unit View */}
      {activeTab === 'phase' && (
        <>
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
                className="p-1 text-text2 hover:text-accent flex-shrink-0"
              >
                <ChevronLeft size={20} />
              </button>
              <div
                className="flex-1 overflow-x-auto"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <div className="flex gap-1 min-w-max justify-center">
                  {PHASES.map(phase => (
                    <button
                      key={phase}
                      onClick={() => {
                        if (exitingPhase) return
                        const dir = PHASES.indexOf(phase) > PHASES.indexOf(gameState.currentPhase) ? 'right' : 'left'
                        setAnimDir(dir)
                        setExitingPhase(gameState.currentPhase)
                        setActiveTiming('start')
                        updateGameState({ currentPhase: phase })
                        setTimeout(() => setExitingPhase(null), 300)
                      }}
                      className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                        gameState.currentPhase === phase
                          ? 'bg-accent text-white'
                          : 'bg-surface2 text-text hover:bg-surface2/80'
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={nextPhase}
                className="p-1 text-text2 hover:text-accent flex-shrink-0"
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

          {/* Sticky Phase + Timing Headers */}
          <div className="sticky top-0 z-30 bg-background border-b border-surface2 -mx-4 px-4 mb-4">
            <div className="flex items-center gap-2 py-2">
              <span className="font-semibold text-text">{gameState.currentPhase}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                gameState.turnOwner === 'yours' ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text2'
              }`}>
                {gameState.turnOwner === 'yours' ? 'Your Turn' : "Opponent's Turn"}
              </span>
            </div>
            {gameState.turnOwner === 'yours' &&
             gameState.currentPhase !== 'Start of Game' &&
             gameState.currentPhase !== 'Start of Battle Round' && (
              <div className="py-1 border-t border-surface2 text-xs text-text2">
                {TIMING_LABELS[activeTiming]}
              </div>
            )}
          </div>

          {/* Animated phase content area */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {exitingPhase && (() => {
              const exitActive = getActiveAbilities(exitingPhase, gameState.turnOwner)
              const exitByTiming = getAbilitiesByTiming(exitingPhase, gameState.turnOwner)
              const exitReactive = getReactiveAbilities(exitingPhase, gameState.turnOwner)
              return (
                <div
                  key={`exit-${exitingPhase}`}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                  className={animDir === 'right' ? 'slide-out-left' : 'slide-out-right'}
                >
                  <PhaseContent
                    phase={exitingPhase}
                    turnOwner={gameState.turnOwner}
                    activeAbilities={exitActive}
                    abilitiesByTiming={exitByTiming}
                    reactiveAbilities={exitReactive}
                    collapsedUnits={collapsedUnits}
                    onToggleUnit={toggleUnit}
                  />
                </div>
              )
            })()}
            <div key={gameState.currentPhase} className={animDir === 'right' ? 'slide-from-right' : 'slide-from-left'}>
              <PhaseContent
                phase={gameState.currentPhase}
                turnOwner={gameState.turnOwner}
                activeAbilities={activeAbilities}
                abilitiesByTiming={abilitiesByTiming}
                reactiveAbilities={reactiveAbilities}
                collapsedUnits={collapsedUnits}
                onToggleUnit={toggleUnit}
                onTimingChange={setActiveTiming}
              />
            </div>
          </div>
        </>
      )}

      {/* Unit View content */}
      {activeTab === 'unit' && (
        <UnitView
          roster={roster}
          unitImages={unitImages}
          onImagesChange={handleImagesChange}
        />
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface2 flex z-40">
        <button
          onClick={() => setActiveTab('phase')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
            activeTab === 'phase' ? 'text-accent' : 'text-text2'
          }`}
        >
          <Swords size={20} />
          Phase View
        </button>
        <button
          onClick={() => setActiveTab('unit')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
            activeTab === 'unit' ? 'text-accent' : 'text-text2'
          }`}
        >
          <Users size={20} />
          Unit View
        </button>
      </div>
    </div>
  )
}

interface PhaseContentProps {
  phase: Phase
  turnOwner: TurnOwner
  activeAbilities: Ability[]
  abilitiesByTiming: Record<Timing, Record<string, Ability[]>>
  reactiveAbilities: Record<string, Ability[]>
  collapsedUnits: Set<string>
  onToggleUnit: (unitName: string) => void
  onTimingChange?: (timing: Timing) => void
}

function PhaseContent({ phase, turnOwner, activeAbilities, abilitiesByTiming, reactiveAbilities, collapsedUnits, onToggleUnit, onTimingChange }: PhaseContentProps) {
  const timingRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!onTimingChange || turnOwner !== 'yours' || phase === 'Start of Game' || phase === 'Start of Battle Round') return

    const handleScroll = () => {
      // 64px covers the two-row sticky header height
      const STICKY_OFFSET = 64
      let current: Timing = TIMINGS[0]
      TIMINGS.forEach((timing, idx) => {
        const el = timingRefs.current[idx]
        if (el && el.getBoundingClientRect().top <= STICKY_OFFSET) {
          current = timing
        }
      })
      onTimingChange(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [onTimingChange, turnOwner, phase])

  return (
    <>
      {turnOwner === 'opponent' && Object.keys(reactiveAbilities).length > 0 && (
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
                onToggle={() => onToggleUnit(unitName)}
              />
            ))}
          </div>
        </div>
      )}
      {turnOwner === 'yours' && phase !== 'Start of Game' && phase !== 'Start of Battle Round' ? (
        <div className="space-y-4">
          {TIMINGS.map((timing, idx) => (
            <div key={timing} ref={el => { timingRefs.current[idx] = el }} className="bg-surface p-4 rounded-lg">
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
                      onToggle={() => onToggleUnit(unitName)}
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
              {turnOwner === 'yours' ? 'Active Abilities' : 'Opponent Phase'}
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
    </>
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
