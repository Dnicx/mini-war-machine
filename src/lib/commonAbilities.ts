import type { Roster, Unit, Ability } from '../types/roster'
import { applyHeuristics } from './phaseHeuristics'

// "Common abilities" are datasheet rules shared across many units (Deadly
// Demise, Feel No Pain, Scouts, Deep Strike, …). They live in Unit.rules but
// aren't surfaced anywhere else, so we lift them into the planner. They are
// planned once (a single shared entry per rule name) and expanded per-unit for
// the phase/unit views.

// Normalize a name for comparison: lowercase + collapse whitespace.
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

// Datasheet rule names carry their value ("Deadly Demise D6", "Feel No Pain
// 6+", "Scouts 6\""). Strip that trailing token so every variant shares one
// planner card; case is preserved for display. Only a whitespace-separated
// value-only token (dice/number/+/inches) is removed, never part of a word.
function stripValueToken(name: string): string {
  return name.replace(/\s+[dx\d]+\+?"?$/i, '').trim()
}

// Grouping key: the value-stripped, normalized base name (so "Deadly Demise D3"
// and "Deadly Demise D6" collapse to one shared card).
function commonAbilityKey(name: string): string {
  return normalizeName(stripValueToken(name))
}

// Strip a trailing value token from a weapon keyword so "Rapid Fire 1" and
// "Anti-Infantry 4+" reduce to their rule base ("rapid fire", "anti-infantry").
function weaponKeywordBase(keyword: string): string {
  return normalizeName(keyword).replace(/\s+[\dx]+\+?"?$/i, '').trim()
}

// Base names of every weapon keyword carried by this unit's models. A
// weapon-keyword rule is always collected from the unit's own wargear, so its
// weapon lives on this same unit — no need to scan the whole roster.
function unitWeaponKeywordBases(unit: Unit): Set<string> {
  const bases = new Set<string>()
  for (const model of unit.models) {
    for (const weapon of model.weapons) {
      for (const keyword of weapon.keywords) {
        const base = weaponKeywordBase(keyword)
        if (base && base !== '-') bases.add(base)
      }
    }
  }
  return bases
}

// Stable id for the single shared plan entry of a common ability. Keyed by the
// value-stripped base name so every unit's variant maps to one planner card.
export function commonAbilityId(name: string): string {
  return `common-${commonAbilityKey(name)}`
}

// Per-unit id used when expanding the shared ability for phase/unit views.
export function commonAbilityUnitId(unitId: string, name: string): string {
  return `${unitId}-common-${commonAbilityKey(name)}`
}

// A unit rule is a "common ability" when its name isn't already shown
// elsewhere: not an army rule, not one of the unit's own abilities, and not a
// weapon keyword the unit carries (those show in the army/weapons views).
export function isCommonAbilityRule(
  ruleName: string,
  unitAbilityNames: Set<string>,
  armyAbilityNames: Set<string>,
  unitWeaponBases: Set<string>
): boolean {
  const name = normalizeName(ruleName)
  if (!name) return false
  if (unitAbilityNames.has(name)) return false
  if (armyAbilityNames.has(name)) return false
  // Base-aware weapon match: rule "Rapid Fire" hides against keyword base
  // "rapid fire", and either side may be the longer form (values differ).
  for (const base of unitWeaponBases) {
    if (base === name || base.startsWith(name) || name.startsWith(base)) return false
  }
  return true
}

export interface CommonAbilityGroup {
  // Shared, heuristic-applied ability (id `common-<name>`, no sourceUnit).
  ability: Ability
  // Units that carry this common ability, for per-unit expansion.
  unitNames: string[]
}

// Build the deduped set of common abilities across the roster, grouped by
// normalized rule name. The first occurrence supplies the shared card's display
// name and description; heuristics run on that text like any other ability.
export function buildCommonAbilities(roster: Roster): CommonAbilityGroup[] {
  const armyAbilityNames = new Set(roster.armyAbilities.map(a => normalizeName(a.name)))
  const groups = new Map<string, CommonAbilityGroup>()

  for (const unit of roster.units) {
    const unitAbilityNames = new Set(unit.abilities.map(a => normalizeName(a.name)))
    const weaponBases = unitWeaponKeywordBases(unit)
    for (const rule of unit.rules) {
      if (!isCommonAbilityRule(rule.name, unitAbilityNames, armyAbilityNames, weaponBases)) {
        continue
      }
      const key = commonAbilityKey(rule.name)
      const existing = groups.get(key)
      if (existing) {
        if (!existing.unitNames.includes(unit.name)) existing.unitNames.push(unit.name)
      } else {
        // Shared card uses the value-stripped base name; per-unit expansion
        // (PlayDashboard) restores each unit's full name + description.
        const base: Ability = {
          id: commonAbilityId(rule.name),
          name: stripValueToken(rule.name),
          description: rule.description
        }
        groups.set(key, { ability: applyHeuristics(base), unitNames: [unit.name] })
      }
    }
  }

  return Array.from(groups.values())
}
