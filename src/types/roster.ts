export type Phase = 'Start of Game' | 'Start of Battle Round' | 'Command' | 'Movement' | 'Shooting' | 'Charge' | 'Fight' | 'Morale'
export type Timing = 'start' | 'beforeTarget' | 'afterTargeted' | 'end'
export type TurnOwner = 'yours' | 'opponent'

export interface Ability {
  id: string
  name: string
  description: string
  sourceUnit?: string
  autoDetectedPhase?: Phase
  autoDetectedPhases?: Phase[]
  autoDetectedTiming?: Timing
  isReactive?: boolean
  oncePerBattle?: boolean
  oncePerBattleRound?: boolean
  userPhases?: Phase[]
  userTiming?: Timing
  notes?: string
}

export interface Weapon {
  name: string
  range: string
  attacks: string
  damage: string
  ap: string
}

export interface Unit {
  id: string
  name: string
  points: number
  abilities: Ability[]
  weapons: Weapon[]
}

export interface Roster {
  id: string
  name: string
  faction: string
  points: number
  units: Unit[]
  armyAbilities: Ability[]
}

export interface PhasePlan {
  abilityId: string
  phase: Phase
  timing: Timing
  notes: string
}

export interface Plan {
  rosterId: string
  phasePlans: PhasePlan[]
  customStratagems: Ability[]
}

export interface GameState {
  battleRound: number
  turnOwner: TurnOwner
  currentPhase: Phase
  currentTiming: Timing
  yourScore: number
  opponentScore: number
  yourCP: number
  opponentCP: number
  usedAbilities: Record<string, number>
}
