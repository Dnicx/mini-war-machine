import type { Ability, Unit } from '../types/roster'

// Shared plan id for a unit ability. Same-name units carry the same datasheet
// abilities, so keying a unit ability by unit name + ability name (instead of
// the per-unit selection id the parser assigns) collapses duplicates onto one
// plan entry: editing one updates all, and the phase view shows it once. The
// roster and unit view keep the units separate. Mirrors commonAbilityId's
// name-based sharing; the `unit-` prefix avoids clashing with `army-`/`common-`.
export function unitAbilityId(unitName: string, abilityName: string): string {
  const norm = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()
  return `unit-${norm(unitName)}-${norm(abilityName)}`
}

// The roster's unit abilities as one entry per (unit name, ability name):
// same-name units share a datasheet, so their abilities collapse onto a single
// shared-id ability. This is the list the Planner renders and the phase view
// groups, so an ability shared by same-name units is planned, saved, and shown
// once. sourceUnit is set for the Planner's per-unit grouping.
export function buildUnitAbilities(units: Unit[]): Ability[] {
  const seen = new Set<string>()
  const result: Ability[] = []
  for (const unit of units) {
    for (const ability of unit.abilities) {
      const id = unitAbilityId(unit.name, ability.name)
      if (seen.has(id)) continue
      seen.add(id)
      result.push({ ...ability, id, sourceUnit: unit.name })
    }
  }
  return result
}
