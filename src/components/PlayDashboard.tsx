import { useState, useEffect, useRef } from 'react'
import { useCarouselDrag } from '../hooks/useCarouselDrag'
import type { CarouselSide } from '../hooks/useCarouselDrag'
import {
  Swords, ChevronDown, ChevronUp, Users, Scroll,
  Crown, Footprints, Crosshair, Zap
} from 'lucide-react'
import { appIcon } from '../config/icons'
import { cardStyles } from '../styles/components'
import type { Roster, Phase, Timing, Ability, GameState, Stratagem, TurnOwner } from '../types/roster'
import { loadPlan, saveGameState, loadGameState, loadUnitImages, saveUnitImages } from '../lib/storage'
import { applyHeuristicsToAll } from '../lib/phaseHeuristics'
import { TIMINGS, TIMING_LABELS, normalizeTiming } from '../lib/timing'
import { effectiveTurnOwner } from '../lib/turnOwnerHeuristics'
import {
  getCoreStratagems, getAvailableDetachments, getDetachmentStratagems
} from '../lib/stratagemRegistry'
import { getStratagemFolderName } from '../lib/factionMapping'
import { detectDetachment } from '../lib/detection'
import { PlayAbilityCard } from './PlayAbilityCard'
import { UnitView } from './UnitView'
import { StratagemsView } from './StratagemsView'

const BackIcon = appIcon('back')

interface PlayDashboardProps {
  roster: Roster
  onBackToPlanner: () => void
}

const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']

// The repeating per-turn loop shown in the phase strip. The two "Start of…"
// pseudo-phases only appear transiently via the Next button / swipe.
const MAIN_PHASES: Phase[] = ['Command', 'Movement', 'Shooting', 'Charge', 'Fight']

const PHASE_STRIP: { phase: Phase; label: string; icon: typeof Swords }[] = [
  { phase: 'Command', label: 'Cmd', icon: Crown },
  { phase: 'Movement', label: 'Move', icon: Footprints },
  { phase: 'Shooting', label: 'Shoot', icon: Crosshair },
  { phase: 'Charge', label: 'Charge', icon: Zap },
  { phase: 'Fight', label: 'Fight', icon: Swords }
]

// One position in the linear game sequence. Advancing past Fight flips the
// turn owner; advancing past the opponent's Fight starts the next round, so
// phase navigation and turn/round changes are a single motion.
interface GameStep {
  phase: Phase
  turnOwner: TurnOwner
  battleRound: number
}

function nextStep(state: GameState): GameStep {
  const { currentPhase, turnOwner, battleRound } = state
  if (currentPhase === 'Start of Game') {
    return { phase: 'Start of Battle Round', turnOwner: 'yours', battleRound }
  }
  if (currentPhase === 'Start of Battle Round') {
    return { phase: 'Command', turnOwner, battleRound }
  }
  const idx = MAIN_PHASES.indexOf(currentPhase)
  if (idx < MAIN_PHASES.length - 1) {
    return { phase: MAIN_PHASES[idx + 1], turnOwner, battleRound }
  }
  // End of Fight: second player's turn, or a new battle round after theirs
  return turnOwner === 'yours'
    ? { phase: 'Command', turnOwner: 'opponent', battleRound }
    : { phase: 'Start of Battle Round', turnOwner: 'yours', battleRound: battleRound + 1 }
}

// null at Start of Game: there is nothing before it, so a back-swipe hits
// the carousel edge instead of wrapping around.
function prevStep(state: GameState): GameStep | null {
  const { currentPhase, turnOwner, battleRound } = state
  if (currentPhase === 'Start of Game') return null
  if (currentPhase === 'Start of Battle Round') {
    return battleRound === 1
      ? { phase: 'Start of Game', turnOwner: 'yours', battleRound: 1 }
      : { phase: 'Fight', turnOwner: 'opponent', battleRound: battleRound - 1 }
  }
  if (currentPhase === 'Command') {
    return turnOwner === 'opponent'
      ? { phase: 'Fight', turnOwner: 'yours', battleRound }
      : { phase: 'Start of Battle Round', turnOwner: 'yours', battleRound }
  }
  const idx = MAIN_PHASES.indexOf(currentPhase)
  return { phase: MAIN_PHASES[idx - 1], turnOwner, battleRound }
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
  const [coreStratagems, setCoreStratagems] = useState<Stratagem[]>([])
  const [detachmentStratagems, setDetachmentStratagems] = useState<Stratagem[]>([])
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  // Lifted out of PhaseContent: during the slide animation two PhaseContent
  // copies mount (exiting + entering), so local state there would reset and
  // collapsed timing sections would visibly re-expand mid-animation.
  const [collapsedTimings, setCollapsedTimings] = useState<Set<Timing>>(new Set())
  const [activeTab, setActiveTab] = useState<'phase' | 'unit' | 'stratagems'>('phase')
  const [unitImages, setUnitImages] = useState<Record<string, string>>(() => loadUnitImages())
  const [attachments, setAttachments] = useState<Record<string, string>>({})
  // The pane sliding in during a drag or programmatic slide. Rendered
  // offset by ±100% inside the track; null when the carousel is at rest.
  const [incoming, setIncoming] = useState<{ step: GameStep; side: CarouselSide } | null>(null)
  const [activeTiming, setActiveTiming] = useState<Timing>('start')
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Load saved game state
    const savedState = loadGameState()
    if (savedState) {
      setGameState(savedState)
    }

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
            timing: normalizeTiming(planEntry.timing),
            // Without this, the turn owner picked in the Planner is ignored and
            // the filter falls back to the auto-detected default ('either').
            turnOwner: planEntry.turnOwner,
            notes: planEntry.notes
          }
        }
        // If no plan entry, use auto-detected phases as default
        return {
          ...ability,
          phases: ability.autoDetectedPhases
        }
      })

      setAllAbilities(withOverrides)
      setCustomStratagems(plan.customStratagems || [])
      setAttachments(plan.attachments ?? {})

      // Load core stratagems
      const coreStrats = getCoreStratagems()
      const coreOverrides = coreStrats.map(strat => {
        const saved = plan.corePhasePlans?.find(p => p.abilityId === strat.id)
        if (saved) {
          return {
            ...strat,
            phases: saved.phases,
            timing: normalizeTiming(saved.timing),
            turnOwner: saved.turnOwner,
            enabled: saved.enabled ?? true
          }
        }
        return strat
      })
      setCoreStratagems(coreOverrides)

      // Load stratagems for every detachment in the roster
      const factionFolder = getStratagemFolderName(roster.faction)
      if (factionFolder) {
        const available = getAvailableDetachments(factionFolder)
        const matched = [...new Set(
          roster.detachments
            .map(det => detectDetachment(det, available))
            .filter((det): det is string => !!det)
        )]
        const detachmentStrats = matched.flatMap(det =>
          getDetachmentStratagems(factionFolder, det)
        )
        const detachmentOverrides = detachmentStrats.map(strat => {
          const saved = plan.detachmentPhasePlans?.find(p => p.abilityId === strat.id)
          if (saved) {
            return {
              ...strat,
              phases: saved.phases,
              timing: normalizeTiming(saved.timing),
              turnOwner: saved.turnOwner
            }
          }
          return strat
        })
        setDetachmentStratagems(detachmentOverrides)
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

  const toggleTiming = (timing: Timing) => {
    setCollapsedTimings(prev => {
      const next = new Set(prev)
      if (next.has(timing)) next.delete(timing)
      else next.add(timing)
      return next
    })
  }

  const commitStep = (step: GameStep) => {
    setActiveTiming('start')
    updateGameState({
      currentPhase: step.phase,
      turnOwner: step.turnOwner,
      battleRound: step.battleRound,
      currentTiming: 'start',
      // Reset once-per-battle-round abilities when a new round begins
      ...(step.battleRound > gameState.battleRound ? { usedAbilities: {} } : {})
    })
  }

  const { handlers: swipeHandlers, slide } = useCarouselDrag(trackRef, {
    onDragSide: (side) => {
      const step = side === 'right' ? nextStep(gameState) : prevStep(gameState)
      if (!step) return false
      setIncoming({ step, side })
    },
    onSettle: (committed) => {
      if (committed && incoming) {
        commitStep(incoming.step)
      }
      setIncoming(null)
    }
  })

  // Programmatic navigation (Next button and phase strip) reuses the same
  // track animation as finger drags so all phase changes feel identical.
  const goToStep = (step: GameStep, side: CarouselSide) => {
    if (incoming || step.phase === gameState.currentPhase) return
    setIncoming({ step, side })
    slide(side)
  }

  // Strip taps jump within the current turn: the owner and round are kept.
  const jumpToPhase = (phase: Phase) => {
    const side: CarouselSide =
      PHASES.indexOf(phase) > PHASES.indexOf(gameState.currentPhase) ? 'right' : 'left'
    goToStep(
      { phase, turnOwner: gameState.turnOwner, battleRound: gameState.battleRound },
      side
    )
  }

  const upcoming = nextStep(gameState)
  const nextLabel =
    upcoming.battleRound > gameState.battleRound
      ? 'Next: New Round'
      : upcoming.turnOwner !== gameState.turnOwner
        ? "Next: Command — Opponent's Turn"
        : `Next: ${upcoming.phase}`

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

      // In the Fight phase both players alternate melee attacks, so show
      // abilities/stratagems regardless of whose turn it currently is.
      if (phase === 'Fight') return phaseMatch

      // Abilities and stratagems resolve turn owner the same way
      const owner = effectiveTurnOwner(ability)
      return phaseMatch && (owner === 'either' || owner === turnOwner)
    })
  }

  const getAbilitiesByTiming = (phase: Phase, turnOwner: TurnOwner) => {
    const abilities = getActiveAbilities(phase, turnOwner)
    const byTiming: Record<Timing, Record<string, Ability[]>> = {
      start: {},
      beforeTarget: {},
      afterTargeted: {},
      beforeExecution: {},
      execution: {},
      afterExecution: {},
      end: {}
    }

    abilities.forEach(ability => {
      const timing = ability.timing || ability.autoDetectedTiming
      // For stratagems, use "Stratagems" as the source unit. Discriminate on
      // 'cpCost' (required on Stratagem, absent on Ability) — unit abilities
      // can also carry a turnOwner key now that plan overrides restore it.
      const sourceUnit = 'cpCost' in ability ? 'Stratagems' : (ability.sourceUnit || 'Army Abilities')

      // Guard against unknown timing values (e.g. stale persisted data) so an
      // unrecognized key falls through to the "show in all sections" branch.
      if (timing && byTiming[timing]) {
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

  const activeAbilities = getActiveAbilities(gameState.currentPhase, gameState.turnOwner)
  const abilitiesByTiming = getAbilitiesByTiming(gameState.currentPhase, gameState.turnOwner)

  const handleImagesChange = (images: Record<string, string>) => {
    setUnitImages(images)
    saveUnitImages(images)
  }

  return (
    <div
      // Extra bottom padding in Phase View so content clears the Next button
      className={`max-w-4xl mx-auto p-4 ${activeTab === 'phase' ? 'pb-32' : 'pb-16'}`}
      style={{ touchAction: 'pan-y' }}
      {...(activeTab === 'phase' ? swipeHandlers : {})}
    >
      {/* Header — always visible */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBackToPlanner}
          className={cardStyles.button.icon}
        >
          <BackIcon size={18} />
          Back to Planner
        </button>
        <h1 className="text-xl font-bold text-accent">Play Mode</h1>
        <div className="w-20" />
      </div>

      {/* Phase View content — hidden in Unit View */}
      {activeTab === 'phase' && (
        <>
          {/* Phase strip: the 5-phase turn loop, all segments visible at
              once so no horizontal scrolling is needed on narrow screens.
              Taps jump within the current turn; the "Start of…" pseudo-
              phases have no segment (nothing is highlighted while active). */}
          <div
            className="flex gap-1 mb-4"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {PHASE_STRIP.map(({ phase, label, icon: Icon }) => (
              <button
                key={phase}
                onClick={() => jumpToPhase(phase)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded text-xs ${
                  gameState.currentPhase === phase
                    ? 'bg-accent text-white'
                    : 'bg-surface2 text-text2 hover:bg-surface2/80'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
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
            {gameState.currentPhase !== 'Start of Game' &&
             gameState.currentPhase !== 'Start of Battle Round' && (
              <div className="py-1 border-t border-surface2 text-xs text-text2">
                {TIMING_LABELS[activeTiming]}
              </div>
            )}
          </div>

          {/* Draggable phase content area. The track's translateX follows
              the finger (written by useCarouselDrag); the incoming pane sits
              offset by ±100% so it slides in as the track moves. */}
          <div style={{ overflow: 'hidden' }}>
            {/* select-none: long-pressing selectable ability text makes
                Android hijack the touch (touchcancel), killing the swipe. */}
            <div ref={trackRef} className="select-none" style={{ position: 'relative' }}>
              {incoming && (() => {
                // The step's own turn owner: sliding past Fight previews the
                // other player's Command phase, not the current owner's.
                const incomingAbilities = getActiveAbilities(incoming.step.phase, incoming.step.turnOwner)
                const incomingByTiming = getAbilitiesByTiming(incoming.step.phase, incoming.step.turnOwner)
                return (
                  <div
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      transform: incoming.side === 'right'
                        ? 'translateX(100%)' : 'translateX(-100%)'
                    }}
                  >
                    <PhaseContent
                      phase={incoming.step.phase}
                      turnOwner={incoming.step.turnOwner}
                      activeAbilities={incomingAbilities}
                      abilitiesByTiming={incomingByTiming}
                      collapsedUnits={collapsedUnits}
                      onToggleUnit={toggleUnit}
                      collapsedTimings={collapsedTimings}
                      onToggleTiming={toggleTiming}
                    />
                  </div>
                )
              })()}
              <PhaseContent
                phase={gameState.currentPhase}
                turnOwner={gameState.turnOwner}
                activeAbilities={activeAbilities}
                abilitiesByTiming={abilitiesByTiming}
                collapsedUnits={collapsedUnits}
                onToggleUnit={toggleUnit}
                collapsedTimings={collapsedTimings}
                onToggleTiming={toggleTiming}
                onTimingChange={setActiveTiming}
              />
            </div>
          </div>
        </>
      )}

      {/* Stratagems View content */}
      {activeTab === 'stratagems' && (
        <StratagemsView
          coreStratagems={coreStratagems.filter(s => s.enabled !== false)}
          detachmentStratagems={detachmentStratagems}
        />
      )}

      {/* Unit View content */}
      {activeTab === 'unit' && (
        <UnitView
          roster={roster}
          unitImages={unitImages}
          onImagesChange={handleImagesChange}
          attachments={attachments}
        />
      )}

      {/* Primary advance control, kept in the thumb zone above the tab bar.
          Walks the linear game sequence, so turn flips and new rounds happen
          here too — there is no separate "Next Turn" button. */}
      {activeTab === 'phase' && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pointer-events-none">
          <button
            onClick={() => goToStep(upcoming, 'right')}
            className="pointer-events-auto block w-full max-w-4xl mx-auto py-3 bg-accent
              text-white rounded-lg font-semibold shadow-lg"
          >
            {nextLabel} ›
          </button>
        </div>
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
          onClick={() => setActiveTab('stratagems')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
            activeTab === 'stratagems' ? 'text-accent' : 'text-text2'
          }`}
        >
          <Scroll size={20} />
          Stratagems
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
  collapsedUnits: Set<string>
  onToggleUnit: (unitName: string) => void
  collapsedTimings: Set<Timing>
  onToggleTiming: (timing: Timing) => void
  onTimingChange?: (timing: Timing) => void
}

function PhaseContent({
  phase, turnOwner, activeAbilities, abilitiesByTiming,
  collapsedUnits, onToggleUnit, collapsedTimings, onToggleTiming, onTimingChange
}: PhaseContentProps) {
  const timingRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!onTimingChange || phase === 'Start of Game' || phase === 'Start of Battle Round') return

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
      {phase !== 'Start of Game' && phase !== 'Start of Battle Round' ? (
        <div className="space-y-4">
          {TIMINGS.map((timing, idx) => {
            // Hide timing sections that have no abilities in this phase
            if (Object.keys(abilitiesByTiming[timing]).length === 0) return null
            return (
            <div key={timing} ref={el => { timingRefs.current[idx] = el }} className="bg-surface p-4 rounded-lg">
              <button
                onClick={() => onToggleTiming(timing)}
                className="flex items-center gap-2 font-semibold text-text mb-3 hover:text-accent transition-colors w-full text-left"
              >
                {collapsedTimings.has(timing) ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                {TIMING_LABELS[timing]}
              </button>
              {!collapsedTimings.has(timing) && (
                <div className="space-y-4">
                  {Object.entries(abilitiesByTiming[timing]).map(([unitName, abilities]) => (
                    <CollapsibleUnitSection
                      key={unitName}
                      unitName={unitName}
                      abilities={abilities}
                      isCollapsed={collapsedUnits.has(unitName)}
                      onToggle={() => onToggleUnit(unitName)}
                    />
                  ))}
                </div>
              )}
            </div>
            )
          })}
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
