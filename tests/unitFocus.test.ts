import { describe, it, expect } from 'vitest'
import { buildFocusUnits, abilityMatchesFocus, rosterTerms } from '../src/lib/unitFocus'
import type { Ability, Roster, Stratagem, Unit } from '../src/types/roster'

function makeUnit(id: string, name: string, keywords: string[]): Unit {
  return {
    id, name, points: 0, abilities: [], rules: [], models: [],
    keywords: keywords.map(keyword => ({ id: `${id}-${keyword}`, name: keyword }))
  }
}

const intercessorsA = makeUnit('u1', 'Intercessor Squad', ['Infantry', 'Battleline'])
const intercessorsB = makeUnit('u2', 'Intercessor Squad', ['Infantry', 'Battleline'])
const intercessorsC = makeUnit('u3', 'Intercessor Squad', ['Infantry', 'Battleline'])
const lieutenant = makeUnit('u4', 'Lieutenant', ['Infantry', 'Character'])
const rhino = makeUnit('u5', 'Rhino', ['Vehicle', 'Transport'])

const roster: Roster = {
  id: 'r', name: 'r', faction: 'Space Marines', detachments: [], points: 0,
  armyAbilities: [],
  units: [intercessorsA, intercessorsB, intercessorsC, lieutenant, rhino]
}
const attachments = { u4: 'u3' }

describe('buildFocusUnits', () => {
  const focusUnits = buildFocusUnits(roster, attachments)

  it('lists same-name units once but keeps a led copy separate', () => {
    expect(focusUnits.map(focusUnit => focusUnit.key)).toEqual([
      'Intercessor Squad', 'Intercessor Squad + Lieutenant', 'Rhino'
    ])
  })

  it('gives an attached unit the keyword union of its units', () => {
    const led = focusUnits.find(focusUnit => focusUnit.key === 'Intercessor Squad + Lieutenant')
    expect(led?.unitNames).toEqual(['Intercessor Squad', 'Lieutenant'])
    expect(led?.terms).toContain('Character')
    expect(led?.terms).toContain('Battleline')
  })

  it('keeps a character standalone when its bodyguard is gone', () => {
    const keys = buildFocusUnits(roster, { u4: 'missing' }).map(focusUnit => focusUnit.key)
    expect(keys).toContain('Lieutenant')
  })
})

describe('abilityMatchesFocus', () => {
  const focusUnits = buildFocusUnits(roster, attachments)
  const led = focusUnits.find(focusUnit => focusUnit.key === 'Intercessor Squad + Lieutenant')!
  const transport = focusUnits.find(focusUnit => focusUnit.key === 'Rhino')!
  const armyTerms = rosterTerms(roster)
  const unitNames = new Set(roster.units.map(unit => unit.name))
  const matches = (ability: Ability, focusUnit = led) =>
    abilityMatchesFocus(ability, focusUnit, armyTerms, unitNames)

  it('keeps abilities of the bodyguard and its characters only', () => {
    expect(matches({ id: 'a', name: 'a', description: '', sourceUnit: 'Lieutenant' })).toBe(true)
    expect(matches({ id: 'b', name: 'b', description: '', sourceUnit: 'Rhino' })).toBe(false)
  })

  it('always keeps army-wide abilities', () => {
    expect(matches({ id: 'c', name: 'Oath of Moment', description: '' })).toBe(true)
  })

  it('filters stratagems by target and keeps custom ones', () => {
    const strat = { id: 's', name: 's', description: '', cpCost: '1CP', type: '', subtype: '',
      when: '', effect: '', target: 'That Character unit.' } as Stratagem
    expect(matches(strat)).toBe(true)
    expect(matches(strat, transport)).toBe(false)
    const custom: Ability = { id: 'x', name: 'x', description: '', cpCost: '1' }
    expect(matches(custom, transport)).toBe(true)
  })
})
