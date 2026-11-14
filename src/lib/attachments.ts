import type { Roster } from '../types/roster'

// Attachments have two sources: the imported file (Unit.attachment, parsed from
// the export's associations) and the saved plan (Plan.attachments, set by the
// Planner's "Attach to..." dropdown). The file is the default and the plan
// overrides it, so a re-import refreshes any grouping the user never touched.
export function resolveAttachments(
  roster: Roster,
  planAttachments: Record<string, string> | undefined
): { attachments: Record<string, string>; roles: Record<string, string> } {
  const attachments: Record<string, string> = {}
  const roles: Record<string, string> = {}

  for (const unit of roster.units) {
    if (!unit.attachment) continue
    attachments[unit.id] = unit.attachment.hostUnitId
    roles[unit.id] = unit.attachment.role
  }

  for (const [leaderId, hostId] of Object.entries(planAttachments ?? {})) {
    // '' is the dropdown's "Attach to..." placeholder: an explicit detach that
    // must survive, otherwise the file's association would re-apply.
    attachments[leaderId] = hostId
    // The role belongs to the file's pairing; once the user picks a different
    // host (or detaches) there is nothing to label the attachment with.
    if (hostId !== roster.units.find(u => u.id === leaderId)?.attachment?.hostUnitId) {
      delete roles[leaderId]
    }
  }

  return { attachments, roles }
}
