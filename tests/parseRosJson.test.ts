import { describe, it, expect, beforeAll } from 'vitest'
import { parseRosJsonFile } from '../src/lib/parseRosJson'
import type { Roster, Unit } from '../src/types/roster'
import { syntheticRosJson } from './fixtures'

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
    expect(roster.detachments).toEqual(['Test Detachment'])
    // Captain Testor + two separate "Test Squad" units (same-name units are
    // not merged)
    expect(roster.units).toHaveLength(3)
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

  it('keeps same-name units separate and applies the invulnerable save fallback', () => {
    const squads = roster.units.filter(u => u.name === 'Test Squad')
    expect(squads).toHaveLength(2)
    for (const squad of squads) {
      expect(squad.points).toBe(85)
      expect(squad.models.find(m => m.name === 'Squad Trooper')?.count).toBe(4)
      for (const model of squad.models) {
        expect(model.invulnerableSave).toBe('5+')
      }
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

describe('parseRosJsonFile with multiple detachments (11th edition)', () => {
  it('collects every detachment and its rules', async () => {
    const json = JSON.stringify({
      roster: {
        name: 'Multi Detachment List',
        costs: [{ name: 'pts', value: 0 }],
        forces: [{
          catalogueName: 'Test Faction',
          rules: [{ id: 'r1', name: 'Army Rule', description: 'Army rule text' }],
          selections: [
            {
              id: 'd1', name: 'Detachment', type: 'upgrade', from: 'entry',
              selections: [{
                id: 'd2', name: 'Detachment One', type: 'upgrade', from: 'group',
                group: 'Detachment',
                rules: [{ id: 'r2', name: 'Rule One', description: 'Rule one text' }]
              }]
            },
            {
              id: 'd3', name: 'Detachment', type: 'upgrade', from: 'entry',
              selections: [{
                id: 'd4', name: 'Detachment Two', type: 'upgrade', from: 'group',
                group: 'Detachments',
                rules: [{ id: 'r3', name: 'Rule Two', description: 'Rule two text' }]
              }]
            }
          ]
        }]
      }
    })
    const roster = await parseRosJsonFile(new File([json], 'multi.json', { type: 'application/json' }))
    expect(roster.detachments).toEqual(['Detachment One', 'Detachment Two'])
    expect(roster.armyAbilities.map(a => a.name))
      .toEqual(['Army Rule', 'Rule One', 'Rule Two'])
  })
})

describe('parseRosJsonFile with same-name units of different loadouts', () => {
  // A character unit (type="model") with its own weapon and abilities. Two of
  // these share the datasheet name "War Drone" but carry different weapons and
  // partly different abilities.
  function droneUnit(id: string, weaponName: string, weaponKeywords: string, extraAbility?: string) {
    const abilities: Array<Record<string, unknown>> = [
      { id: `${id}-hov`, name: 'Hover', typeName: 'Abilities',
        characteristics: [{ name: 'Description', $text: 'It hovers.' }] }
    ]
    if (extraAbility) {
      abilities.push({ id: `${id}-x`, name: extraAbility, typeName: 'Abilities',
        characteristics: [{ name: 'Description', $text: 'Extra.' }] })
    }
    return {
      id, name: 'War Drone', type: 'model', from: 'entry', number: 1,
      profiles: [
        { id: `${id}-u`, name: 'War Drone', typeName: 'Unit', characteristics: [
          { name: 'M', $text: '10"' }, { name: 'T', $text: '9' }, { name: 'Sv', $text: '3+' },
          { name: 'W', $text: '9' }, { name: 'LD', $text: '7+' }, { name: 'OC', $text: '2' }
        ] },
        ...abilities
      ],
      selections: [
        { id: `${id}-w`, name: weaponName, type: 'upgrade', from: 'group', number: 1,
          profiles: [{ id: `${id}-wp`, name: weaponName, typeName: 'Ranged Weapons', characteristics: [
            { name: 'Range', $text: '12"' }, { name: 'A', $text: 'D6' }, { name: 'BS', $text: '3+' },
            { name: 'S', $text: '5' }, { name: 'AP', $text: '-1' }, { name: 'D', $text: '1' },
            { name: 'Keywords', $text: weaponKeywords }
          ] }] }
      ],
      costs: [{ name: 'pts', typeId: 'pts', value: 100 }],
      categories: [{ id: `${id}-c`, name: 'Vehicle', primary: true }]
    }
  }

  it('lists each unit separately with its own weapons and abilities', async () => {
    const json = JSON.stringify({
      roster: {
        name: 'Drone List', costs: [{ name: 'pts', value: 200 }],
        forces: [{
          catalogueName: 'Test Faction',
          selections: [
            { id: 'det', name: 'Detachment', type: 'upgrade', from: 'entry', selections: [
              { id: 'det1', name: 'Test Detachment', type: 'upgrade', from: 'group', group: 'Detachment', rules: [] }
            ] },
            droneUnit('drone1', 'Plague Spitter', 'Torrent', 'Barrage'),
            droneUnit('drone2', 'Heavy Blaster', 'Blast')
          ]
        }]
      }
    })
    const roster = await parseRosJsonFile(new File([json], 'drones.json', { type: 'application/json' }))

    const drones = roster.units.filter(u => u.name === 'War Drone')
    expect(drones).toHaveLength(2)

    const weaponsOf = (u: Unit) => u.models.flatMap(m => m.weapons.map(w => w.name))
    const byWeapon = (name: string) => drones.find(d => weaponsOf(d).includes(name))!

    // Each unit keeps only its own weapon...
    expect(weaponsOf(byWeapon('Plague Spitter'))).toEqual(['Plague Spitter'])
    expect(weaponsOf(byWeapon('Heavy Blaster'))).toEqual(['Heavy Blaster'])
    // ...with that weapon's own keywords.
    expect(byWeapon('Plague Spitter').models[0].weapons[0].keywords).toEqual(['Torrent'])
    expect(byWeapon('Heavy Blaster').models[0].weapons[0].keywords).toEqual(['Blast'])

    // Abilities stay with the right unit: both have Hover, only drone1 has Barrage.
    expect(byWeapon('Plague Spitter').abilities.map(a => a.name).sort()).toEqual(['Barrage', 'Hover'])
    expect(byWeapon('Heavy Blaster').abilities.map(a => a.name)).toEqual(['Hover'])
  })
})
