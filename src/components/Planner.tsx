import { useState, useEffect, useRef, useMemo } from 'react'
import type { Roster, Ability, Phase, Timing, Stratagem, TurnOwner } from '../types/roster'
import { applyHeuristicsToAll } from '../lib/phaseHeuristics'
import { savePlan, loadPlan, loadUnitImages, saveUnitImages } from '../lib/storage'
import { getCoreStratagems, getAvailableDetachments, getDetachmentStratagems } from '../lib/stratagemRegistry'
import { getStratagemFolderName } from '../lib/factionMapping'
import { detectDetachment } from '../lib/detection'
import { PlannerHeader } from './PlannerHeader'
import { CustomStratagemForm } from './CustomStratagemForm'
import { DetachmentSelector } from './DetachmentSelector'
import { StratagemSection } from './StratagemSection'
import { ArmyAbilitiesSection } from './ArmyAbilitiesSection'
import { UnitAbilitiesSection } from './UnitAbilitiesSection'
import { CustomStratagemsSection } from './CustomStratagemsSection'

interface PlannerProps {
  roster: Roster
  onPlayMode: () => void
  onBackToImport: () => void
  onRosterRenamed: (newName: string) => void
}

type PlannerSection = 'core' | 'detachment' | 'abilities'

const PLANNER_SECTION_LABELS: Record<PlannerSection, string> = {
  core: 'Core Stratagems',
  detachment: 'Detachment Stratagems',
  abilities: 'Abilities',
}

export function Planner({ roster, onPlayMode, onBackToImport, onRosterRenamed }: PlannerProps) {
  const [allAbilities, setAllAbilities] = useState<Ability[]>([])
  const [customStratagems, setCustomStratagems] = useState<Ability[]>([])
  const [coreStratagems, setCoreStratagems] = useState<Stratagem[]>([])
  const [detachmentStratagems, setDetachmentStratagems] = useState<Stratagem[]>([])
  const [selectedDetachment, setSelectedDetachment] = useState<string>('')
  const [currentEmptyIndex, setCurrentEmptyIndex] = useState(0)
  const abilityRefs = useRef<Record<string, HTMLDivElement>>({})
  const [saved, setSaved] = useState(true)
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  const [debug, setDebug] = useState(false)
  const [unitImages, setUnitImages] = useState<Record<string, string>>(() => loadUnitImages())
  const [attachments, setAttachments] = useState<Record<string, string>>(() => loadPlan(roster.id)?.attachments ?? {})
  const [activeSection, setActiveSection] = useState<PlannerSection>('core')
  const coreStratagemRef = useRef<HTMLDivElement>(null)
  const detachmentStratagemRef = useRef<HTMLDivElement>(null)
  const abilitiesRef = useRef<HTMLDivElement>(null)

  const factionFolder = useMemo(() => getStratagemFolderName(roster.faction), [roster.faction])
  const availableDetachments = useMemo(() => factionFolder ? getAvailableDetachments(factionFolder) : [], [factionFolder])

  const handleImagesChange = (images: Record<string, string>) => {
    setUnitImages(images)
    saveUnitImages(images)
  }

  useEffect(() => {
    const STICKY_OFFSET = 48
    const handleScroll = () => {
      let current: PlannerSection = 'core'
      const checks = [
        { ref: coreStratagemRef, section: 'core' as PlannerSection },
        { ref: detachmentStratagemRef, section: 'detachment' as PlannerSection },
        { ref: abilitiesRef, section: 'abilities' as PlannerSection },
      ]
      for (const { ref, section } of checks) {
        if (ref.current && ref.current.getBoundingClientRect().top <= STICKY_OFFSET) {
          current = section
        }
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const savedPlan = loadPlan(roster.id)


    const allAbilitiesList = [
      ...roster.armyAbilities,
      ...roster.units.flatMap(unit =>
        unit.abilities.map(a => ({ ...a, sourceUnit: unit.name }))
      )
    ]

    const withHeuristics = applyHeuristicsToAll(allAbilitiesList)
    const coreStrats = getCoreStratagems()

    const detectedDetachment = detectDetachment(roster.detachment, availableDetachments)
    const initialDetachment = savedPlan?.selectedDetachment || detectedDetachment || ''
    setSelectedDetachment(initialDetachment)

    let detachmentStrats: Stratagem[] = []
    if (initialDetachment && factionFolder) {
      detachmentStrats = getDetachmentStratagems(factionFolder, initialDetachment)
    }

    if (savedPlan && savedPlan.rosterId === roster.id) {
      setAttachments(savedPlan.attachments ?? {})

      const withOverrides = withHeuristics.map(ability => {
        const saved = savedPlan.phasePlans.find(p => p.abilityId === ability.id)
        if (saved) {
          return {
            ...ability,
            phases: saved.phases,
            timing: saved.timing,
            turnOwner: saved.turnOwner,
            notes: saved.notes
          }
        }
        return ability
      })
      setAllAbilities(withOverrides)
      setCustomStratagems(savedPlan.customStratagems || [])

      const coreOverrides = coreStrats.map(strat => {
        const saved = savedPlan.corePhasePlans?.find(p => p.abilityId === strat.id)
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

      const detachmentOverrides = detachmentStrats.map(strat => {
        const saved = savedPlan.detachmentPhasePlans?.find(p => p.abilityId === strat.id)
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
    } else {
      setAllAbilities(withHeuristics.map(ability => ({
        ...ability,
        phases: ability.autoDetectedPhases,
        timing: ability.autoDetectedTiming
      })))
      setCoreStratagems(coreStrats.map(s => ({
        ...s,
        phases: s.autoDetectedPhases,
        timing: s.autoDetectedTiming
      })))
      setDetachmentStratagems(detachmentStrats.map(s => ({
        ...s,
        phases: s.autoDetectedPhases,
        timing: s.autoDetectedTiming
      })))
    }
  }, [roster, factionFolder, availableDetachments])

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

  const handleTurnOwnerChange = (abilityId: string, turnOwner: TurnOwner) => {
    setAllAbilities(prev => prev.map(a =>
      a.id === abilityId ? { ...a, turnOwner } : a
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
        timing: a.autoDetectedTiming,
        turnOwner: a.autoDetectedTurnOwner
      }
    }))
    setSaved(false)
  }

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all phase selections to auto-detected values?')) {
      setAllAbilities(prev => prev.map(a => ({
        ...a,
        phases: a.autoDetectedPhases,
        timing: a.autoDetectedTiming,
        turnOwner: a.autoDetectedTurnOwner
      })))
      setSaved(false)
    }
  }

  
  const handleDeleteStratagem = (id: string) => {
    setCustomStratagems(prev => prev.filter(s => s.id !== id))
    setSaved(false)
  }

  const handleScrollToNextEmpty = () => {
    const abilitiesWithEmptyPhases = allAbilities.filter(a => !a.phases || a.phases.length === 0)
    if (abilitiesWithEmptyPhases.length === 0) return

    const nextIndex = (currentEmptyIndex + 1) % abilitiesWithEmptyPhases.length
    setCurrentEmptyIndex(nextIndex)

    const nextAbility = abilitiesWithEmptyPhases[nextIndex]
    if (nextAbility && abilityRefs.current[nextAbility.id]) {
      abilityRefs.current[nextAbility.id].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Stratagem handlers
  const handleStratagemPhaseToggle = (stratagemId: string, phase: Phase, isCore: boolean) => {
    const setState = isCore ? setCoreStratagems : setDetachmentStratagems
    setState(prev => prev.map(s => {
      if (s.id !== stratagemId) return s
      const currentPhases = s.phases || []
      const newPhases = currentPhases.includes(phase)
        ? currentPhases.filter(p => p !== phase)
        : [...currentPhases, phase]
      return { ...s, phases: newPhases.length > 0 ? newPhases : undefined }
    }))
    setSaved(false)
  }

  const handleStratagemTimingChange = (stratagemId: string, timing: Timing, isCore: boolean) => {
    const setState = isCore ? setCoreStratagems : setDetachmentStratagems
    setState(prev => prev.map(s =>
      s.id === stratagemId ? { ...s, timing } : s
    ))
    setSaved(false)
  }

  const handleStratagemTurnOwnerChange = (stratagemId: string, turnOwner: TurnOwner, isCore: boolean) => {
    const setState = isCore ? setCoreStratagems : setDetachmentStratagems
    setState(prev => prev.map(s =>
      s.id === stratagemId ? { ...s, turnOwner } : s
    ))
    setSaved(false)
  }

  const handleStratagemEnableToggle = (stratagemId: string, enabled: boolean) => {
    setCoreStratagems(prev => prev.map(s =>
      s.id === stratagemId ? { ...s, enabled } : s
    ))
    setSaved(false)
  }

  const handleStratagemReset = (stratagemId: string, isCore: boolean) => {
    const setState = isCore ? setCoreStratagems : setDetachmentStratagems
    setState(prev => prev.map(s => {
      if (s.id !== stratagemId) return s
      return {
        ...s,
        phases: s.autoDetectedPhases,
        timing: s.autoDetectedTiming,
        turnOwner: s.autoDetectedTurnOwner
      }
    }))
    setSaved(false)
  }

  const handleDetachmentChange = (detachment: string) => {
    setSelectedDetachment(detachment)
    if (detachment && factionFolder) {
      setDetachmentStratagems(getDetachmentStratagems(factionFolder, detachment))
    } else {
      setDetachmentStratagems([])
    }
    setSaved(false)
  }

  const handleSave = () => {
    const phasePlans = allAbilities.map(ability => ({
      abilityId: ability.id,
      phases: ability.phases || [],
      timing: (ability.timing || '') as Timing,
      turnOwner: ability.turnOwner,
      notes: ability.notes || ''
    }))

    const corePhasePlans = coreStratagems.map(strat => ({
      abilityId: strat.id,
      phases: strat.phases || [],
      timing: (strat.timing || '') as Timing,
      notes: '',
      turnOwner: strat.turnOwner,
      enabled: strat.enabled
    }))

    const detachmentPhasePlans = detachmentStratagems.map(strat => ({
      abilityId: strat.id,
      phases: strat.phases || [],
      timing: (strat.timing || '') as Timing,
      notes: '',
      turnOwner: strat.turnOwner
    }))

    const plan = {
      rosterId: roster.id,
      phasePlans,
      customStratagems,
      selectedDetachment,
      corePhasePlans,
      detachmentPhasePlans,
      attachments
    }

    savePlan(plan, roster.id, debug)
    setSaved(true)
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-4 pb-16">
        <PlannerHeader
          onBackToImport={onBackToImport}
          onResetAll={handleResetAll}
          onSave={handleSave}
          onPlayMode={onPlayMode}
          saved={saved}
          rosterName={roster.name}
          onRosterRenamed={onRosterRenamed}
        />

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
          <CustomStratagemForm
            onAddStratagem={(name, description) => {
              const newStratagem: Ability = {
                id: `custom-${Date.now()}`,
                name,
                description
              }
              setCustomStratagems(prev => [...prev, newStratagem])
              setSaved(false)
            }}
          />
        </div>

        <DetachmentSelector
          availableDetachments={availableDetachments}
          selectedDetachment={selectedDetachment}
          onDetachmentChange={handleDetachmentChange}
        />

        {/* Error message for no matching detachment */}
        {availableDetachments.length === 0 && factionFolder && (
          <div className="mb-6 bg-red-500/10 border border-red-500 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-100 mb-2">⚠️ No Matching Detachment Found</h3>
            <p className="text-red-100">
              No detachment stratagems found for faction "{roster.faction}" (folder: {factionFolder}).
              This could mean:
            </p>
            <ul className="list-disc list-inside text-red-100 mt-2 ml-4">
              <li>The faction name doesn't match any in the mapping</li>
              <li>The detachment folder structure doesn't exist</li>
              <li>The roster detachment field doesn't match available options</li>
            </ul>
            <p className="text-red-100 mt-3">
              Please check the faction mapping in <code>src/lib/factionMapping.ts</code> and ensure the 
              stratagem XML files exist in <code>src/stratagems/[faction]/</code>
            </p>
          </div>
        )}

        {/* Sticky Section Header */}
        <div className="sticky top-0 z-30 bg-background border-b border-surface2 -mx-4 px-4 mb-4">
          <div className="py-2">
            <span className="font-semibold text-text">{PLANNER_SECTION_LABELS[activeSection]}</span>
          </div>
        </div>

        <StratagemSection
          coreStratagems={coreStratagems}
          detachmentStratagems={detachmentStratagems}
          selectedDetachment={selectedDetachment}
          onToggleEnable={handleStratagemEnableToggle}
          onPhaseToggle={handleStratagemPhaseToggle}
          onTimingChange={handleStratagemTimingChange}
          onTurnOwnerChange={handleStratagemTurnOwnerChange}
          onReset={handleStratagemReset}
          coreRef={coreStratagemRef}
          detachmentRef={detachmentStratagemRef}
        />

        <div ref={abilitiesRef}>
          <ArmyAbilitiesSection
            abilities={allAbilities.filter(a => !a.sourceUnit)}
            onPhaseToggle={handlePhaseToggle}
            onTimingChange={handleTimingChange}
            onTurnOwnerChange={handleTurnOwnerChange}
            onNotesChange={handleNotesChange}
            onResetAbility={handleResetAbility}
            onAbilityRef={(id, node) => {
              if (node) abilityRefs.current[id] = node
            }}
          />

          <UnitAbilitiesSection
            units={roster.units.map(unit => ({
              id: unit.id,
              name: unit.name,
              abilities: allAbilities.filter(a => a.sourceUnit === unit.name),
              keywords: unit.keywords
            }))}
            collapsedUnits={collapsedUnits}
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
            onTurnOwnerChange={handleTurnOwnerChange}
            onNotesChange={handleNotesChange}
            onResetAbility={handleResetAbility}
            onAbilityRef={(id, node) => {
              if (node) abilityRefs.current[id] = node
            }}
            unitImages={unitImages}
            onImagesChange={handleImagesChange}
            allUnits={roster.units.map(u => ({ id: u.id, name: u.name }))}
            attachments={attachments}
            onAttachmentChange={(leaderId, hostId) => {
              setAttachments(prev => ({ ...prev, [leaderId]: hostId }))
              setSaved(false)
            }}
          />

          <CustomStratagemsSection
            customStratagems={customStratagems}
            onDeleteStratagem={handleDeleteStratagem}
          />
        </div>
      </div>
      <button
        onClick={handleScrollToNextEmpty}
        className="fixed bottom-6 right-6 px-6 py-3 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 flex items-center gap-2 shadow-lg border border-red-500/30 z-50"
      >
        Next Empty
      </button>
    </div>
  )
}

