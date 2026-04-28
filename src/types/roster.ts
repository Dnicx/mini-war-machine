export type Phase = 'Start of Game' | 'Start of Battle Round' | 'Command' | 'Movement' | 'Shooting' | 'Charge' | 'Fight' | 'Morale'
export type Timing = 'start' | 'beforeTarget' | 'afterTargeted' | 'end'
export type TurnOwner = 'yours' | 'opponent'

export interface Ability {
  id: string
  name: string
  description: string
  sourceUnit?: string
  autoDetectedPhases?: Phase[]
  autoDetectedTiming?: Timing
  isReactive?: boolean
  oncePerBattle?: boolean
  oncePerBattleRound?: boolean
  phases?: Phase[]
  timing?: Timing
  notes?: string
}

export interface Rule {
  id: string
  name: string
  description: string
  sourceUnit?: string
}

export interface Keyword {
  id: string
  name: string
  sourceUnit?: string
}

export interface Weapon {
  name: string
  range: string
  attacks: string
  damage: string
  ap: string
  bs: string
  s: string
  keywords: string[]
}

export interface Model {
  id: string
  name: string
  count: number
  movement: string
  toughness: string
  wounds: string
  save: string
  invulnerableSave: string
  leadership: string
  objectiveControl: string
  weapons: Weapon[]
  rules: Rule[]
}

export interface Unit {
  id: string
  name: string
  points: number
  abilities: Ability[]
  rules: Rule[]
  keywords: Keyword[]
  models: Model[]
}

export interface Roster {
  id: string
  name: string
  faction: string
  detachment: string
  points: number
  units: Unit[]
  armyAbilities: Ability[]
}

export interface PhasePlan {
  abilityId: string
  phases: Phase[]
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
