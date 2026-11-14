import type { Ability, Roster, Unit } from '../types/roster'
import { stratagemTargetsUnit } from './stratagemTarget'

// One entry in the phase view's unit focus picker. An attached unit (bodyguard
// plus its leader/support characters) is one entry, because on the table it
// is a single unit.
export interface FocusUnit {
  // Bodyguard name + sorted character names; also the picker label.
  // Same-name units with the same characters share a key (and an entry),
  // since they share abilities.
  key: string
  // Datasheet names in this unit; phase-view abilities are matched by these.
  unitNames: string[]
  // Union of all models' keywords and datasheet names: in 11th edition an
  // attached unit has every keyword of the units that form it.
  terms: string[]
  // Unit id whose image represents the entry in the picker.
  imageUnitId: string
}

function unitTerms(unit: Unit): string[] {
  return [unit.name, ...unit.keywords.map(keyword => keyword.name)]
}

// attachments: characterUnitId → bodyguardUnitId (Plan.attachments)
export function buildFocusUnits(
  roster: Roster, attachments: Record<string, string>
): FocusUnit[] {
  const charactersByHost = new Map<string, Unit[]>()
  for (const unit of roster.units) {
    const hostId = attachments[unit.id]
    if (!hostId) continue
    const characters = charactersByHost.get(hostId) ?? []
    characters.push(unit)
    charactersByHost.set(hostId, characters)
  }

  const focusUnits = new Map<string, FocusUnit>()
  for (const unit of roster.units) {
    // Attached characters appear only inside their bodyguard's entry. A stale
    // attachment to a unit no longer in the roster leaves the character alone.
    const hostId = attachments[unit.id]
    if (hostId && roster.units.some(host => host.id === hostId)) continue

    const characters = charactersByHost.get(unit.id) ?? []
    const characterNames = characters.map(character => character.name).sort()
    const key = [unit.name, ...characterNames].join(' + ')
    if (focusUnits.has(key)) continue
    focusUnits.set(key, {
      key,
      unitNames: [unit.name, ...characterNames],
      terms: [...unitTerms(unit), ...characters.flatMap(unitTerms)],
      imageUnitId: unit.id
    })
  }
  return [...focusUnits.values()]
}

export function rosterTerms(roster: Roster): string[] {
  return roster.units.flatMap(unitTerms)
}

// Decides whether a phase-view item stays visible while a unit is focused.
export function abilityMatchesFocus(
  ability: Ability, focusUnit: FocusUnit, armyTerms: string[], rosterUnitNames: Set<string>
): boolean {
  // Stratagems (custom ones included) carry cpCost; see getAbilitiesByTiming.
  if ('cpCost' in ability) {
    const target = 'target' in ability ? (ability.target as string | undefined) : undefined
    return stratagemTargetsUnit(target, focusUnit.terms, armyTerms)
  }
  // Anything not sourced from a roster unit is army-wide and always applies.
  if (!ability.sourceUnit || !rosterUnitNames.has(ability.sourceUnit)) return true
  return focusUnit.unitNames.includes(ability.sourceUnit)
}
