import { describe, it, expect, beforeAll } from 'vitest'
import { parseRosFile } from '../src/lib/parseRos'
import type { Roster, Unit } from '../src/types/roster'
import { syntheticRosXml } from './fixtures'

function unit(roster: Roster, name: string): Unit {
  const found = roster.units.find(u => u.name === name)
  if (!found) throw new Error(`Unit "${name}" not found in roster`)
  return found
}

describe('parseRosFile with an 11th edition style .ros file', () => {
  let roster: Roster
  beforeAll(async () => {
    roster = await parseRosFile(new File([syntheticRosXml], 'test.ros', { type: 'text/xml' }))
  })

  it('parses the roster header', () => {
    expect(roster.name).toBe('Synthetic Test List')
    expect(roster.points).toBe(265)
    expect(roster.faction).toBe('Test Faction')
    expect(roster.detachment).toBe('Test Detachment')
    expect(roster.units).toHaveLength(2)
  })

  it('parses character stats, including the renamed Sv and InSv characteristics', () => {
    const captain = unit(roster, 'Captain Testor')
    expect(captain.models).toHaveLength(1)
    const model = captain.models[0]
    expect(model.movement).toBe('6"')
    expect(model.toughness).toBe('4')
    expect(model.wounds).toBe('5')
    expect(model.save).toBe('2+')
    expect(model.invulnerableSave).toBe('4+')
  })

  it('parses character weapons with melee range override', () => {
    const model = unit(roster, 'Captain Testor').models[0]
    expect(model.weapons.map(w => w.name)).toEqual(['Test Pistol', 'Test Blade', 'Rack Launcher'])
    expect(model.weapons.find(w => w.name === 'Test Blade')?.range).toBe('Melee')
    expect(model.weapons.find(w => w.name === 'Test Pistol')?.keywords).toEqual(['Pistol'])
    expect(model.weapons.find(w => w.name === 'Rack Launcher')?.keywords).toEqual(['Blast', 'Assault'])
  })

  it('includes enhancement costs in unit points', () => {
    // Captain is 80 pts plus a 15 pts enhancement in a nested selection
    expect(unit(roster, 'Captain Testor').points).toBe(95)
  })

  it('does not duplicate weapons from wargear nested inside other wargear', () => {
    // Rack Launcher sits two selection levels deep (Weapon Rack > Rack Launcher)
    const model = unit(roster, 'Captain Testor').models[0]
    expect(model.weapons.filter(w => w.name === 'Rack Launcher')).toHaveLength(1)
  })

  it('merges same-name units, summing points and model counts', () => {
    // The fixture contains two identical Test Squads
    const squad = unit(roster, 'Test Squad')
    expect(squad.points).toBe(170)
    expect(squad.models.map(m => m.name)).toEqual(['Squad Trooper', 'Squad Sergeant'])
    expect(squad.models.find(m => m.name === 'Squad Trooper')?.count).toBe(8)
    expect(squad.models.find(m => m.name === 'Squad Sergeant')?.count).toBe(2)
  })

  it('parses squad models with their own stats and weapons', () => {
    const squad = unit(roster, 'Test Squad')
    const trooper = squad.models.find(m => m.name === 'Squad Trooper')!
    expect(trooper.save).toBe('3+')
    expect(trooper.leadership).toBe('6+')
    expect(trooper.weapons.map(w => w.name)).toEqual(['Boltgun', 'Combat Knife'])
    expect(trooper.weapons.find(w => w.name === 'Combat Knife')?.range).toBe('Melee')
    const sergeant = squad.models.find(m => m.name === 'Squad Sergeant')!
    expect(sergeant.leadership).toBe('5+')
  })

  it('falls back to the unit-level Invulnerable Save abilities profile', () => {
    // Squad models have InSv "-" on their Unit profiles; the invuln only
    // exists as an Abilities profile on the unit selection
    const squad = unit(roster, 'Test Squad')
    for (const model of squad.models) {
      expect(model.invulnerableSave).toBe('5+')
    }
  })

  it('extracts abilities, keywords, rules and army-wide rules', () => {
    const captain = unit(roster, 'Captain Testor')
    expect(captain.abilities.map(a => a.name)).toContain('Leader Ability')
    expect(captain.keywords.map(k => k.name)).toEqual(['Character', 'Epic Hero'])
    expect(captain.rules.map(r => r.name)).toContain('Oath of Testing')
    expect(roster.armyAbilities.map(a => a.name)).toEqual(['Test Army Rule', 'Detachment Rule'])
    expect(roster.armyAbilities[1].description).toBe('Detachment rule text')
  })
})

describe('parseRosFile with 10th edition style data', () => {
  it('still reads SV and the Invulnerable Save characteristic/profile', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<roster name="Old Edition List" xmlns="http://www.battlescribe.net/schema/rosterSchema">
  <costs><cost name="pts" typeId="pts" value="100"/></costs>
  <forces><force id="f1" name="Army Roster" catalogueName="Test Faction">
    <rules><rule id="r1" name="Army Rule"><description>Army rule text</description></rule></rules>
    <selections>
      <selection id="d1" name="Detachment" type="upgrade" from="entry">
        <selections>
          <selection id="d2" name="Test Detachment" type="upgrade" from="group" group="Detachment">
            <rules><rule id="r2" name="Detachment Rule"><description>Detachment rule text</description></rule></rules>
          </selection>
        </selections>
      </selection>
      <selection id="c1" name="Old Captain" type="model" from="entry" number="1">
        <profiles>
          <profile id="p1" name="Old Captain" typeName="Unit">
            <characteristics>
              <characteristic name="M">6"</characteristic>
              <characteristic name="T">4</characteristic>
              <characteristic name="SV">2+</characteristic>
              <characteristic name="W">5</characteristic>
              <characteristic name="LD">6+</characteristic>
              <characteristic name="OC">1</characteristic>
            </characteristics>
          </profile>
          <profile id="p2" name="Invulnerable Save" typeName="Abilities">
            <characteristics><characteristic name="Description">5+</characteristic></characteristics>
          </profile>
        </profiles>
        <costs><cost name="pts" typeId="pts" value="100"/></costs>
      </selection>
    </selections>
  </force></forces>
</roster>`
    const roster = await parseRosFile(new File([xml], 'old.ros', { type: 'text/xml' }))
    expect(roster.detachment).toBe('Test Detachment')
    const model = roster.units[0].models[0]
    expect(model.save).toBe('2+')
    expect(model.invulnerableSave).toBe('5+')
    expect(roster.units[0].points).toBe(100)
    expect(roster.armyAbilities.map(a => a.name)).toEqual(['Army Rule', 'Detachment Rule'])
  })
})
