import type { Ability, Phase, Timing } from '../types/roster'

const PHASE_PATTERNS: Record<Phase, RegExp[]> = {
  'Start of Game': [/start of (the )?game/i, /before the battle/i, /pre-battle/i, /deployment/i, /model can be attached/i, /capacity of/i],
  'Start of Battle Round': [/start of (the )?(battle )?round/i, /start of (your )?turn/i, /beginning of (the )?(battle )?round/i],
  Morale: [/morale/i, /battle shock/i, /end of turn/i, /morale phase/i, /during the morale phase/i],
  Command: [/command/i, /command phase/i, /Objective Control/i],
  Movement: [/movement/i, /move/i, /advance/i, /movement phase/i, /during the movement phase/i, /capacity of/i],
  Shooting: [/shooting/i, /shoot/i, /an attack/i, /fire/i, /shooting phase/i, /during the shooting phase/i, /in shooting phase/i, /enemy shooting/i, /opponent shooting/i],
  Charge: [/charge/i, /end of movement/i, /charge phase/i, /during the charge phase/i],
  Fight: [/fight/i, /combat/i, /melee/i, /fight phase/i, /during the fight phase/i, /in fight phase/i, /melee phase/i, /an attack/i]
}

const TIMING_PATTERNS: Record<Timing, RegExp[]> = {
  start: [/start of/i, /beginning of/i, /at the start/i],
  beforeTarget: [/before/i, /when selecting/i, /when choosing/i],
  afterTargeted: [/after/i, /when targeted/i, /when hit/i],
  end: [/end of/i, /at the end/i]
}

const REACTIVE_PATTERNS = [
  /when targeted/i,
  /when hit/i,
  /when charged/i,
  /react/i,
  /intercept/i,
  /counter/i
]

const ONCE_PER_BATTLE = [/once per battle/i, /one use only/i]
const ONCE_PER_ROUND = [/once per battle round/i, /once per turn/i]

export function detectPhases(description: string): Phase[] {
  const detectedPhases: Phase[] = []
  for (const [phase, patterns] of Object.entries(PHASE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        detectedPhases.push(phase as Phase)
        break // Only add each phase once
      }
    }
  }
  return detectedPhases
}

export function detectTiming(description: string): Timing | undefined {
  for (const [timing, patterns] of Object.entries(TIMING_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        return timing as Timing
      }
    }
  }
  return undefined
}

export function detectReactive(description: string): boolean {
  return REACTIVE_PATTERNS.some(pattern => pattern.test(description))
}

export function detectOncePerBattle(description: string): boolean {
  return ONCE_PER_BATTLE.some(pattern => pattern.test(description))
}

export function detectOncePerRound(description: string): boolean {
  return ONCE_PER_ROUND.some(pattern => pattern.test(description))
}

export function applyHeuristics(ability: Ability): Ability {
  const phases = detectPhases(ability.description)
  const timing = detectTiming(ability.description)
  const isReactive = detectReactive(ability.description)
  const oncePerBattle = detectOncePerBattle(ability.description)
  const oncePerRound = detectOncePerRound(ability.description)

  // Hard-coded check for Invulnerable Save - always suggest Shooting and Fight phases
  let finalPhases = phases
  if (ability.name === 'Invulnerable Save') {
    const invulnPhases: Phase[] = ['Shooting', 'Fight']
    // Merge with detected phases, avoiding duplicates
    finalPhases = [...new Set([...phases, ...invulnPhases])]
  }

  console.log(`[Phase Detection] "${ability.name}":`, {
    phases: finalPhases.length > 0 ? finalPhases : 'None',
    timing: timing || 'None',
    isReactive,
    oncePerBattle,
    oncePerRound
  })

  return {
    ...ability,
    autoDetectedPhases: finalPhases,
    autoDetectedTiming: timing,
    isReactive,
    oncePerBattle,
    oncePerBattleRound: oncePerRound
  }
}

export function applyHeuristicsToAll(abilities: Ability[]): Ability[] {
  return abilities.map(applyHeuristics)
}
