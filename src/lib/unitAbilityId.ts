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
