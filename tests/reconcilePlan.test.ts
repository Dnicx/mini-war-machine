import { describe, it, expect } from 'vitest'
import { reconcilePlan } from '../src/lib/reconcilePlan'
import { unitAbilityId } from '../src/lib/unitAbilityId'
import type { Ability, Unit, Roster, Plan, PhasePlan } from '../src/types/roster'

function mkAbility(unitName: string, name: string): Ability {
  return { id: unitAbilityId(unitName, name), name, description: '' }
}

function mkUnit(id: string, name: string, abilityNames: string[]): Unit {
  return {
    id,
    name,
    points: 0,
    abilities: abilityNames.map(n => mkAbility(name, n)),
    rules: [],
    keywords: [],
    models: []
  }
}

function mkRoster(id: string, units: Unit[], armyAbilities: Ability[] = []): Roster {
  return { id, name: id, faction: 'F', detachments: [], points: 0, units, armyAbilities }
}

function pp(abilityId: string, notes = ''): PhasePlan {
  return { abilityId, phases: ['Command'], timing: 'start', notes }
}

function mkPlan(
  rosterId: string,
  phasePlans: PhasePlan[],
  attachments?: Record<string, string>
): Plan {
  return { rosterId, phasePlans, customStratagems: [], attachments }
}

describe('reconcilePlan', () => {
  describe('phase plans', () => {
    // Unit abilities are keyed by unitAbilityId (name-based), so a rebuild that
    // changes every selection id must still line up with the saved plan.
    const oldRoster = mkRoster('old-rid', [
      mkUnit('u1', 'Captain', ['Rites']),
      mkUnit('w1', 'Squad', ['Guard'])
    ])
    const newRoster = mkRoster('new-rid', [
      mkUnit('x9', 'Captain', ['Rites']),
      mkUnit('t1', 'Terminators', ['Deep Strike'])
    ])
    const oldPlan = mkPlan('old-rid', [
      pp(unitAbilityId('Captain', 'Rites'), 'keep my note'),
      pp(unitAbilityId('Squad', 'Guard')),
      pp('common-deadly demise'),
      pp('army-Doctrine')
    ])
    const result = reconcilePlan(oldRoster, newRoster, oldPlan)
    const byId = (id: string) => result.phasePlans.find(p => p.abilityId === id)

    it('re-points the plan at the new roster id', () => {
      expect(result.rosterId).toBe('new-rid')
    })

    it('keeps a kept ability and its note despite new selection ids', () => {
      expect(byId(unitAbilityId('Captain', 'Rites'))?.notes).toBe('keep my note')
    })

    it('keeps a removed unit\'s correction dormant', () => {
      expect(byId(unitAbilityId('Squad', 'Guard'))).toBeDefined()
    })

    it('does not invent corrections for newly added units', () => {
      expect(byId(unitAbilityId('Terminators', 'Deep Strike'))).toBeUndefined()
    })

    it('passes army and common entries through untouched', () => {
      expect(byId('army-Doctrine')).toBeDefined()
      expect(byId('common-deadly demise')).toBeDefined()
    })
  })

  describe('attachments', () => {
    it('keeps ids that still exist in the new roster', () => {
      const old = mkRoster('o', [mkUnit('u1', 'Captain', []), mkUnit('i1', 'Intercessors', [])])
      const next = mkRoster('n', [mkUnit('u1', 'Captain', []), mkUnit('i1', 'Intercessors', [])])
      const result = reconcilePlan(old, next, mkPlan('o', [], { u1: 'i1' }))
      expect(result.attachments).toEqual({ u1: 'i1' })
    })

    it('remaps by unit name when selection ids changed', () => {
      const old = mkRoster('o', [mkUnit('u1', 'Captain', []), mkUnit('i1', 'Intercessors', [])])
      const next = mkRoster('n', [mkUnit('x9', 'Captain', []), mkUnit('y2', 'Intercessors', [])])
      const result = reconcilePlan(old, next, mkPlan('o', [], { u1: 'i1' }))
      expect(result.attachments).toEqual({ x9: 'y2' })
    })

    it('drops an attachment whose unit is gone', () => {
      const old = mkRoster('o', [mkUnit('u1', 'Captain', []), mkUnit('i1', 'Intercessors', [])])
      const next = mkRoster('n', [mkUnit('x9', 'Captain', [])])
      const result = reconcilePlan(old, next, mkPlan('o', [], { u1: 'i1' }))
      expect(result.attachments).toEqual({})
    })

    it('pairs same-name units one-to-one instead of collapsing them', () => {
      // Two leaders and two hosts sharing datasheet names, all ids changed.
      const old = mkRoster('o', [
        mkUnit('L1', 'Captain', []), mkUnit('L2', 'Captain', []),
        mkUnit('H1', 'Intercessors', []), mkUnit('H2', 'Intercessors', [])
      ])
      const next = mkRoster('n', [
        mkUnit('a1', 'Captain', []), mkUnit('a2', 'Captain', []),
        mkUnit('b1', 'Intercessors', []), mkUnit('b2', 'Intercessors', [])
      ])
      const result = reconcilePlan(old, next, mkPlan('o', [], { L1: 'H1', L2: 'H2' }))
      const entries = Object.entries(result.attachments!)
      expect(entries).toHaveLength(2)
      // Distinct leaders and distinct hosts - nothing collapsed onto one id.
      expect(new Set(entries.map(([leader]) => leader)).size).toBe(2)
      expect(new Set(entries.map(([, host]) => host)).size).toBe(2)
    })
  })
})
