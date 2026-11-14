import { describe, it, expect } from 'vitest'
import { resolveAttachments } from '../src/lib/attachments'
import type { Roster, Unit } from '../src/types/roster'

function unit(id: string, name: string, attachment?: Unit['attachment']): Unit {
  return { id, name, points: 0, abilities: [], rules: [], keywords: [], models: [], attachment }
}

// A leader attached by the file, a support character attached by the file, an
// unattached character, and the two hosts.
function roster(): Roster {
  return {
    id: 'r1',
    name: 'Test List',
    faction: 'Test Faction',
    detachments: [],
    points: 0,
    armyAbilities: [],
    units: [
      unit('lead1', 'Captain', { hostUnitId: 'squad1', role: 'Leading' }),
      unit('supp1', 'Apothecary', { hostUnitId: 'squad2', role: 'Supporting' }),
      unit('loner', 'Techmarine'),
      unit('squad1', 'Test Squad'),
      unit('squad2', 'Test Squad')
    ]
  }
}

describe('resolveAttachments', () => {
  it('uses the roster file when the plan has no attachments', () => {
    const { attachments, roles } = resolveAttachments(roster(), undefined)
    expect(attachments).toEqual({ lead1: 'squad1', supp1: 'squad2' })
    expect(roles).toEqual({ lead1: 'Leading', supp1: 'Supporting' })
  })

  it('keeps the role when the plan re-confirms the file\'s host', () => {
    const { attachments, roles } = resolveAttachments(roster(), { lead1: 'squad1' })
    expect(attachments.lead1).toBe('squad1')
    expect(roles.lead1).toBe('Leading')
  })

  it('drops the role when the plan repoints the character elsewhere', () => {
    const { attachments, roles } = resolveAttachments(roster(), { lead1: 'squad2' })
    expect(attachments.lead1).toBe('squad2')
    expect(roles.lead1).toBeUndefined()
    // The other file-derived pairing is untouched.
    expect(roles.supp1).toBe('Supporting')
  })

  it('honours an explicit detach instead of re-applying the file', () => {
    const { attachments, roles } = resolveAttachments(roster(), { supp1: '' })
    expect(attachments.supp1).toBe('')
    expect(roles.supp1).toBeUndefined()
  })

  it('accepts a manual attachment for a character the file left unattached', () => {
    const { attachments, roles } = resolveAttachments(roster(), { loner: 'squad1' })
    expect(attachments.loner).toBe('squad1')
    // No role: the pairing came from the dropdown, not the export.
    expect(roles.loner).toBeUndefined()
  })

  it('is a no-op for a roster with no associations and no plan', () => {
    const bare: Roster = { ...roster(), units: [unit('a', 'A'), unit('b', 'B')] }
    expect(resolveAttachments(bare, {})).toEqual({ attachments: {}, roles: {} })
  })
})
