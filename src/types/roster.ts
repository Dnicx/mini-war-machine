export type Phase = 'Start of Game' | 'Start of Battle Round' | 'Command' | 'Movement' | 'Shooting' | 'Charge' | 'Fight'
export type Timing = 'start' | 'beforeTarget' | 'afterTargeted' | 'beforeExecution' | 'execution' | 'afterExecution' | 'end'
export type TurnOwner = 'yours' | 'opponent' | 'either'

export interface Ability {
  id: string
  name: string
  description: string
  sourceUnit?: string
  autoDetectedPhases?: Phase[]
  autoDetectedTiming?: Timing
  autoDetectedTurnOwner?: TurnOwner
  turnOwner?: TurnOwner
  oncePerBattle?: boolean
  oncePerBattleRound?: boolean
  phases?: Phase[]
  timing?: Timing
  notes?: string
  // Custom stratagems set this so they group/display like stratagems (purple
  // + CP badge). Real stratagems still carry their own required cpCost below.
  cpCost?: string
}

export interface Stratagem extends Ability {
  cpCost: string
  type: string
  subtype: string
  lore?: string
  when: string
  target?: string
  effect: string
  restrictions?: string
  enabled?: boolean
  autoDetectedTurnOwner?: TurnOwner
  turnOwner?: TurnOwner
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
  // 11th edition armies can contain more than one detachment
  detachments: string[]
  points: number
  units: Unit[]
  armyAbilities: Ability[]
}

export interface RosterMeta {
  id: string
  name: string
  faction: string
  detachments: string[]
  points: number
  lastUsed: number
}

export interface PhasePlan {
  abilityId: string
  phases: Phase[]
  timing: Timing
  notes: string
  turnOwner?: TurnOwner
  enabled?: boolean
}

export interface Plan {
  rosterId: string
  phasePlans: PhasePlan[]
  customStratagems: Ability[]
  // Legacy field: detachments now come from the roster itself
  selectedDetachment?: string
  corePhasePlans?: (PhasePlan & { enabled?: boolean })[]
  detachmentPhasePlans?: PhasePlan[]
  // leaderUnitId → hostUnitId; a leader can only attach to one unit
  attachments?: Record<string, string>
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
