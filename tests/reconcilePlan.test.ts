import { describe, it, expect } from 'vitest'
import { reconcilePlan } from '../src/lib/reconcilePlan'
import type { Ability, Unit, Roster, Plan, PhasePlan } from '../src/types/roster'

function mkAbility(id: string, name: string): Ability {
  return { id, name, description: '' }
}

function mkUnit(id: string, name: string, abilities: Ability[]): Unit {
  return { id, name, points: 0, abilities, rules: [], keywords: [], models: [] }
}

function mkRoster(id: string, units: Unit[], armyAbilities: Ability[] = []): Roster {
  return { id, name: id, faction: 'F', detachments: [], points: 0, units, armyAbilities }
}

function mkPlan(rosterId: string, phasePlans: PhasePlan[], attachments?: Record<string, string>): Plan {
  return { rosterId, phasePlans, customStratagems: [], attachments }
}

function pp(abilityId: string, notes = ''): PhasePlan {
  return { abilityId, phases: ['Command'], timing: 'start', notes }
}

describe('reconcilePlan', () => {
  // Old roster: Captain(u1) leads Intercessors(i1); Squad(w1) will be removed.
  const oldRoster = mkRoster(
    'old-rid',
    [
      mkUnit('u1', 'Captain', [mkAbility('u1-Rites', 'Rites')]),
      mkUnit('i1', 'Intercessors', [mkAbility('i1-Oath', 'Oath')]),
      mkUnit('w1', 'Squad', [mkAbility('w1-Guard', 'Guard')])
    ],
    [mkAbility('army-Doctrine', 'Doctrine')]
  )
  // New roster: same units by NAME but new ids (simulating a rebuild); Squad
  // removed, Terminators added.
  const newRoster = mkRoster(
    'new-rid',
    [
      mkUnit('x9', 'Captain', [mkAbility('x9-Rites', 'Rites')]),
      mkUnit('y2', 'Intercessors', [mkAbility('y2-Oath', 'Oath')]),
      mkUnit('t1', 'Terminators', [mkAbility('t1-Deep', 'Deep Strike')])
    ],
    [mkAbility('army-Doctrine', 'Doctrine')]
  )
  const oldPlan = mkPlan(
    'old-rid',
    [pp('u1-Rites', 'keep my note'), pp('i1-Oath'), pp('w1-Guard'), pp('army-Doctrine')],
    { u1: 'i1' }
  )

  const result = reconcilePlan(oldRoster, newRoster, oldPlan)
  const byId = (id: string) => result.phasePlans.find(p => p.abilityId === id)

  it('re-points the plan at the new roster id', () => {
    expect(result.rosterId).toBe('new-rid')
  })

  it('re-keys a kept ability by name and preserves its note', () => {
    expect(byId('u1-Rites')).toBeUndefined()
    expect(byId('x9-Rites')).toBeDefined()
    expect(byId('x9-Rites')!.notes).toBe('keep my note')
    expect(byId('y2-Oath')).toBeDefined()
  })

  it('keeps a removed unit\'s correction dormant (unchanged id)', () => {
    expect(byId('w1-Guard')).toBeDefined()
  })

  it('does not invent corrections for newly added units', () => {
    expect(byId('t1-Deep')).toBeUndefined()
  })

  it('carries through army-ability corrections (stable id)', () => {
    expect(byId('army-Doctrine')).toBeDefined()
  })

  it('re-keys attachments by unit name and drops those whose unit is gone', () => {
    expect(result.attachments).toEqual({ x9: 'y2' })
  })
})
