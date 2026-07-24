import { describe, it, expect } from 'vitest'
import { unitAbilityId } from '../src/lib/unitAbilityId'

describe('unitAbilityId', () => {
  it('is shared across units that have the same name and ability', () => {
    expect(unitAbilityId('Foetid Bloat-drone', 'Deadly Demise'))
      .toBe(unitAbilityId('Foetid Bloat-drone', 'Deadly Demise'))
  })

  it('is case- and whitespace-insensitive', () => {
    expect(unitAbilityId('  Foetid   Bloat-drone ', 'DEADLY demise'))
      .toBe(unitAbilityId('Foetid Bloat-drone', 'Deadly Demise'))
  })

  it('differs for different unit names or ability names', () => {
    expect(unitAbilityId('Typhus', 'Leader')).not.toBe(unitAbilityId('Lord of Poxes', 'Leader'))
    expect(unitAbilityId('Typhus', 'Leader')).not.toBe(unitAbilityId('Typhus', 'The Destroyer Hive'))
  })

  it('is namespaced away from army/common ids', () => {
    expect(unitAbilityId('Typhus', 'Leader')).toMatch(/^unit-/)
  })
})
