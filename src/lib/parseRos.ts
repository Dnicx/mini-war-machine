import type { Roster, Unit, Ability, Weapon } from '../types/roster'

export async function parseRosFile(file: File): Promise<Roster> {
  const text = await file.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')

  const rosterElement = doc.querySelector('roster')
  if (!rosterElement) {
    throw new Error('Invalid .ros file: no roster element found')
  }

  const rosterName = rosterElement.getAttribute('name') || 'Unknown Roster'
  const rosterId = rosterElement.getAttribute('id') || Date.now().toString()
  const points = parseInt(rosterElement.getAttribute('points') || '0')

  // Get faction from catalogue
  const catalogue = doc.querySelector('catalogue')
  const faction = catalogue?.getAttribute('name') || 'Unknown Faction'

  // Extract units
  const units: Unit[] = []
  const selections = doc.querySelectorAll('selections > selection')

  selections.forEach((selection) => {
    const name = selection.getAttribute('name')
    if (!name) return

    const unitId = selection.getAttribute('id') || `${rosterId}-${name}`
    const unitPoints = parseInt(selection.getAttribute('points') || '0')

    // Extract abilities from profile[typeName="Abilities"] (these are the actual abilities to plan)
    const abilities: Ability[] = []
    const abilityProfiles = selection.querySelectorAll('profiles > profile[typeName="Abilities"]')
    abilityProfiles.forEach((profile) => {
      const abilityName = profile.getAttribute('name')
      if (abilityName) {
        const characteristics = profile.querySelectorAll('characteristics > characteristic')
        let description = ''
        characteristics.forEach((char) => {
          const charName = char.getAttribute('name')
          const charValue = char.textContent || ''
          if (charName === 'Description') description = charValue.trim()
        })
        abilities.push({
          id: `${unitId}-${abilityName}`,
          name: abilityName,
          description,
          sourceUnit: name
        })
      }
    })

    // Also extract abilities from nested selections (characters often have abilities in sub-selections)
    const nestedSelections = selection.querySelectorAll('selections > selection')
    nestedSelections.forEach((nested) => {
      const nestedName = nested.getAttribute('name')
      const nestedAbilityProfiles = nested.querySelectorAll('profiles > profile[typeName="Abilities"]')
      nestedAbilityProfiles.forEach((profile) => {
        const abilityName = profile.getAttribute('name')
        if (abilityName) {
          const characteristics = profile.querySelectorAll('characteristics > characteristic')
          let description = ''
          characteristics.forEach((char) => {
            const charName = char.getAttribute('name')
            const charValue = char.textContent || ''
            if (charName === 'Description') description = charValue.trim()
          })
          abilities.push({
            id: `${unitId}-${nestedName}-${abilityName}`,
            name: abilityName,
            description,
            sourceUnit: name
          })
        }
      })
    })

    // Extract weapons
    const weapons: Weapon[] = []
    const profiles = selection.querySelectorAll('profiles > profile[type="Weapon"]')
    profiles.forEach((profile) => {
      const weaponName = profile.getAttribute('name')
      if (weaponName) {
        const characteristics = profile.querySelectorAll('characteristics > characteristic')
        let range = '-'
        let attacks = '-'
        let damage = '-'
        let ap = '-'

        characteristics.forEach((char) => {
          const charName = char.getAttribute('name')
          const charValue = char.getAttribute('value') || '-'
          if (charName === 'Range') range = charValue
          if (charName === 'Attacks') attacks = charValue
          if (charName === 'Damage') damage = charValue
          if (charName === 'AP') ap = charValue
        })

        weapons.push({
          name: weaponName,
          range,
          attacks,
          damage,
          ap
        })
      }
    })

    units.push({
      id: unitId,
      name,
      points: unitPoints,
      abilities,
      weapons
    })
  })

  // Extract army-wide abilities
  const armyAbilities: Ability[] = []
  const sharedRules = doc.querySelectorAll('sharedRules > rule')
  sharedRules.forEach((rule) => {
    const ruleName = rule.getAttribute('name')
    const description = rule.getAttribute('description') || ''
    if (ruleName) {
      armyAbilities.push({
        id: `army-${ruleName}`,
        name: ruleName,
        description
      })
    }
  })

  return {
    id: rosterId,
    name: rosterName,
    faction,
    points,
    units,
    armyAbilities
  }
}

export async function fetchFromYellowscribe(id: string): Promise<Roster> {
  const response = await fetch(`https://yellowscribe.link/get_army_by_id?id=${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch from Yellowscribe')
  }
  const text = await response.text()
  
  // Create a File object from the response
  const file = new File([text], 'roster.ros', { type: 'text/xml' })
  return parseRosFile(file)
}
