import type { Roster, Plan } from '../types/roster'

// Carries a saved Plan across a roster update (re-import of a GW-updated file).
//
// Phase plans need no translation: unit abilities are keyed by unitAbilityId
// (unit name + ability name), army/common/stratagem ids are name-derived too,
// so a re-import — even a rebuild with all-new selection ids — reproduces the
// same ability ids. Attachments are the exception: they are keyed by
// Unit.id, which still comes from the roster file, so they are remapped here.

// Normalize a unit name for matching: trim, lowercase, collapse inner whitespace.
function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// attachments map leaderUnitId -> hostUnitId. Ids that still exist in the new
// roster are kept as-is; the rest are matched by unit name. Same-name units are
// claimed one-to-one (never collapsed onto a single id), and an attachment
// whose leader or host is gone is dropped.
function reconcileAttachments(
  oldRoster: Roster,
  newRoster: Roster,
  attachments: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!attachments) return attachments

  const newUnitIds = new Set(newRoster.units.map(u => u.id))
  const oldIdToName = new Map(oldRoster.units.map(u => [u.id, norm(u.name)]))
  // Candidates per name, in roster order, so duplicates pair up predictably.
  const idsByName = new Map<string, string[]>()
  for (const unit of newRoster.units) {
    const key = norm(unit.name)
    if (!idsByName.has(key)) idsByName.set(key, [])
    idsByName.get(key)!.push(unit.id)
  }

  // An id kept by an exact match must not be handed out again by name.
  const claimed = new Set<string>()
  for (const unitId of [...Object.keys(attachments), ...Object.values(attachments)]) {
    if (newUnitIds.has(unitId)) claimed.add(unitId)
  }

  const remap = (unitId: string): string | undefined => {
    if (newUnitIds.has(unitId)) return unitId
    const name = oldIdToName.get(unitId)
    const candidate = name && idsByName.get(name)?.find(id => !claimed.has(id))
    if (candidate) claimed.add(candidate)
    return candidate
  }

  const result: Record<string, string> = {}
  for (const [leaderId, hostId] of Object.entries(attachments)) {
    const newLeader = remap(leaderId)
    const newHost = remap(hostId)
    if (newLeader && newHost) result[newLeader] = newHost
  }
  return result
}

export function reconcilePlan(
  oldRoster: Roster,
  newRoster: Roster,
  oldPlan: Plan
): Plan {
  return {
    ...oldPlan,
    rosterId: newRoster.id,
    attachments: reconcileAttachments(oldRoster, newRoster, oldPlan.attachments)
  }
}
