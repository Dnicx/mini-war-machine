import { describe, it, expect, beforeAll } from 'vitest'
import { parseRosFile } from '../src/lib/parseRos'
import { parseRosJsonFile } from '../src/lib/parseRosJson'
import type { Roster, Unit } from '../src/types/roster'
import { syntheticRosXml, syntheticRosJson } from './fixtures'
import { stripIds } from './helpers'

function unit(roster: Roster, name: string): Unit {
  const found = roster.units.find(u => u.name === name)
  if (!found) throw new Error(`Unit "${name}" not found in roster`)
  return found
}

describe('parseRosJsonFile with an 11th edition style .json export', () => {
  let roster: Roster
  beforeAll(async () => {
    roster = await parseRosJsonFile(new File([syntheticRosJson], 'test.json', { type: 'application/json' }))
  })

  it('parses the roster header', () => {
    expect(roster.name).toBe('Synthetic Test List')
    expect(roster.points).toBe(265)
    expect(roster.faction).toBe('Test Faction')
    expect(roster.detachment).toBe('Test Detachment')
    expect(roster.units).toHaveLength(2)
  })

  it('parses character stats including save and invulnerable save', () => {
    const model = unit(roster, 'Captain Testor').models[0]
    expect(model.save).toBe('2+')
    expect(model.invulnerableSave).toBe('4+')
    expect(model.wounds).toBe('5')
  })

  it('parses weapons with melee range override', () => {
    const model = unit(roster, 'Captain Testor').models[0]
    expect(model.weapons.map(w => w.name)).toEqual(['Test Pistol', 'Test Blade', 'Rack Launcher'])
    expect(model.weapons.find(w => w.name === 'Test Blade')?.range).toBe('Melee')
  })

  it('includes enhancement costs in unit points', () => {
    expect(unit(roster, 'Captain Testor').points).toBe(95)
  })

  it('merges same-name units and applies the invulnerable save fallback', () => {
    const squad = unit(roster, 'Test Squad')
    expect(squad.points).toBe(170)
    expect(squad.models.find(m => m.name === 'Squad Trooper')?.count).toBe(8)
    for (const model of squad.models) {
      expect(model.invulnerableSave).toBe('5+')
    }
  })

  it('extracts army abilities including detachment rules', () => {
    expect(roster.armyAbilities.map(a => a.name)).toEqual(['Test Army Rule', 'Detachment Rule'])
  })

  it('rejects files that are not a roster export', async () => {
    const notJson = new File(['<roster/>'], 'x.json', { type: 'application/json' })
    await expect(parseRosJsonFile(notJson)).rejects.toThrow('not valid JSON')
    const noRoster = new File(['{"foo": 1}'], 'x.json', { type: 'application/json' })
    await expect(parseRosJsonFile(noRoster)).rejects.toThrow('no roster object')
  })
})

describe('parser equivalence', () => {
  it('produces the same roster from the .ros and .json form of the same list', async () => {
    const fromXml = await parseRosFile(new File([syntheticRosXml], 'test.ros', { type: 'text/xml' }))
    const fromJson = await parseRosJsonFile(new File([syntheticRosJson], 'test.json', { type: 'application/json' }))
    // ids embed per-export selection ids and a random roster id, so compare
    // everything else: names, points, stats, weapons, abilities, keywords...
    expect(stripIds(fromJson)).toEqual(stripIds(fromXml))
  })
})
