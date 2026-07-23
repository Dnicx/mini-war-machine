import type { Roster, Plan } from '../types/roster'

// Re-maps a saved Plan from an old roster onto a freshly parsed one after a GW
// update. Corrections are matched by NAME, not by ability/unit id: New Recruit
// usually keeps ids stable, but a from-scratch rebuild (or a future exporter
// change) regenerates them, so name matching is what actually survives.

// Normalize a name for matching: trim, lowercase, collapse inner whitespace.
function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Army abilities have no owning unit, so they share a fixed bucket. Uses a
// bracketed token that cannot collide with a real unit name.
const ARMY_KEY = '[army]'

// Build abilityId -> nameKey over the same set the Planner keys phase plans on:
// army abilities plus every unit's abilities (see Planner allAbilitiesList).
function abilityKeyById(roster: Roster): Map<string, string> {
  const map = new Map<string, string>()
  for (const ability of roster.armyAbilities) {
    map.set(ability.id, `${ARMY_KEY}|${norm(ability.name)}`)
  }
  for (const unit of roster.units) {
    for (const ability of unit.abilities) {
      map.set(ability.id, `${norm(unit.name)}|${norm(ability.name)}`)
    }
  }
  return map
}

// attachments map leaderUnitId -> hostUnitId, so they must be re-keyed by unit
// name too, and dropped if either side no longer exists in the new roster.
function reconcileAttachments(
  oldRoster: Roster,
  newRoster: Roster,
  attachments: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!attachments) return attachments
  const oldIdToName = new Map(oldRoster.units.map(u => [u.id, norm(u.name)]))
  const nameToNewId = new Map(newRoster.units.map(u => [norm(u.name), u.id]))
  const remap = (unitId: string): string | undefined => {
    const name = oldIdToName.get(unitId)
    return name ? nameToNewId.get(name) : undefined
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
  const oldIdToKey = abilityKeyById(oldRoster)
  const keyToNewId = new Map<string, string>()
  for (const [newId, key] of abilityKeyById(newRoster)) {
    keyToNewId.set(key, newId)
  }

  const phasePlans = oldPlan.phasePlans.map(plan => {
    const key = oldIdToKey.get(plan.abilityId)
    const newId = key ? keyToNewId.get(key) : undefined
    // Matched -> re-key onto the updated ability. Unmatched (removed unit) is
    // kept as-is so re-adding the unit later restores its correction.
    return newId ? { ...plan, abilityId: newId } : plan
  })

  // corePhasePlans / detachmentPhasePlans / customStratagems key off bundled
  // stratagem ids (name-derived, independent of the roster file), so they carry
  // through unchanged via the spread below.
  return {
    ...oldPlan,
    rosterId: newRoster.id,
    phasePlans,
    attachments: reconcileAttachments(oldRoster, newRoster, oldPlan.attachments)
  }
}
