import { describe, it, expect } from 'vitest'
import { stratagemTargetsUnit } from '../src/lib/stratagemTarget'

// Keyword sets shaped like BattleScribe categories ("Faction: ..." prefix).
const intercessors = ['Faction: Adeptus Astartes', 'Infantry', 'Battleline', 'Intercessor Squad']
const terminators = ['Faction: Adeptus Astartes', 'Infantry', 'Terminator', 'Terminator Squad']
const rhino = ['Faction: Adeptus Astartes', 'Vehicle', 'Transport', 'Rhino']
const lieutenant = ['Faction: Adeptus Astartes', 'Infantry', 'Character', 'Lieutenant']
const army = [...intercessors, ...terminators, ...rhino, ...lieutenant]

// Target strings below are copied from the repo's stratagem XML files.
describe('stratagemTargetsUnit', () => {
  it('applies custom stratagems (no target) to every unit', () => {
    expect(stratagemTargetsUnit(undefined, rhino, army)).toBe(true)
  })

  it('applies generic targets to every unit', () => {
    expect(stratagemTargetsUnit('That unit or model.', rhino, army)).toBe(true)
    expect(stratagemTargetsUnit(
      'One friendly unit that is in strategic reserves (excluding Aircraft).', rhino, army
    )).toBe(true)
  })

  it('matches a faction-only target against faction units', () => {
    const target = 'One Adeptus Astartes unit from your army that was selected as the target ' +
      'of one or more of the attacking unit’s attacks.'
    expect(stratagemTargetsUnit(target, rhino, army)).toBe(true)
  })

  it('requires every keyword within one alternative', () => {
    const target = 'One Adeptus Astartes Infantry unit from your army that has not been ' +
      'selected to shoot or fight this phase.'
    expect(stratagemTargetsUnit(target, intercessors, army)).toBe(true)
    expect(stratagemTargetsUnit(target, rhino, army)).toBe(false)
  })

  it('accepts any alternative of a comma/or list, tolerating odd spacing', () => {
    const target = 'One Adeptus Astartes Terminator , Bladeguard Veteran Squad , Sternguard ' +
      'Veteran Squad or Vanguard Veteran Squad unit from your army.'
    expect(stratagemTargetsUnit(target, terminators, army)).toBe(true)
    expect(stratagemTargetsUnit(target, intercessors, army)).toBe(false)
  })

  it('treats "/" as alternatives', () => {
    expect(stratagemTargetsUnit('That Monster/Vehicle unit.', rhino, army)).toBe(true)
  })

  it('matches the keyword union of an attached unit', () => {
    const attached = [...intercessors, ...lieutenant]
    expect(stratagemTargetsUnit('That Character unit.', attached, army)).toBe(true)
    expect(stratagemTargetsUnit('That Character unit.', intercessors, army)).toBe(false)
  })

  it('reads keywords before "model" when no "unit" comes first', () => {
    const target = 'One Battlewagon , Hunta Rig or Kill Rig model from your army that was ' +
      'hit by one or more of the attacking unit’s attacks.'
    const battlewagon = ['Faction: Orks', 'Vehicle', 'Battlewagon']
    const boyz = ['Faction: Orks', 'Infantry', 'Boyz']
    const orkArmy = [...battlewagon, ...boyz]
    expect(stratagemTargetsUnit(target, battlewagon, orkArmy)).toBe(true)
    expect(stratagemTargetsUnit(target, boyz, orkArmy)).toBe(false)
  })

  it('ignores unknown alternatives once a sibling alternative is recognized', () => {
    // The army has Vehicles but no Monsters: the list was read, so hide it.
    expect(stratagemTargetsUnit('That Monster/Vehicle unit.', intercessors, army)).toBe(false)
  })

  it('shows the stratagem when a required keyword is unknown to the whole army', () => {
    // No unit has "Explosives"/"Grenades": could be a weapon keyword, so stay inclusive.
    const target = 'One friendly unengaged Explosives/Grenades unit that is eligible to shoot.'
    expect(stratagemTargetsUnit(target, rhino, army)).toBe(true)
  })

  it('hides the stratagem for excluded units', () => {
    const target = 'One Orks unit from your army (excluding Gretchin units) that is within ' +
      'range of the loot objective.'
    const gretchin = ['Faction: Orks', 'Infantry', 'Gretchin']
    const boyz = ['Faction: Orks', 'Infantry', 'Boyz']
    expect(stratagemTargetsUnit(target, gretchin, [...gretchin, ...boyz])).toBe(false)
    expect(stratagemTargetsUnit(target, boyz, [...gretchin, ...boyz])).toBe(true)
  })

  it('reads "and/or" as an alternative', () => {
    const target = 'Up to two Phobos and/or Scout Squad units from your army.'
    const scouts = ['Faction: Adeptus Astartes', 'Infantry', 'Scout Squad']
    const phobos = ['Faction: Adeptus Astartes', 'Infantry', 'Phobos']
    const scoutArmy = [...army, ...scouts, ...phobos]
    expect(stratagemTargetsUnit(target, scouts, scoutArmy)).toBe(true)
    expect(stratagemTargetsUnit(target, phobos, scoutArmy)).toBe(true)
    expect(stratagemTargetsUnit(target, rhino, scoutArmy)).toBe(false)
  })
})
