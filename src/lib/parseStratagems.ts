import type { Stratagem, Ability } from '../types/roster'
import { applyHeuristics } from './phaseHeuristics'
import { detectTurnOwner } from './turnOwnerHeuristics'

export function parseStratagemXml(xml: string): Stratagem[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const stratagemElements = doc.querySelectorAll('stratagem')

  const stratagems: Stratagem[] = []

  stratagemElements.forEach((element, index) => {
    const name = element.querySelector('name')?.textContent || ''
    const cpCost = element.querySelector('cpCost')?.textContent || ''
    const type = element.querySelector('type')?.textContent || ''
    const subtype = element.querySelector('subtype')?.textContent || ''
    const lore = element.querySelector('lore')?.textContent || ''
    const when = element.querySelector('when')?.textContent || ''
    const target = element.querySelector('target')?.textContent || ''
    const effect = element.querySelector('effect')?.textContent || ''
    const restrictions = element.querySelector('restrictions')?.textContent || ''

    // Build description for heuristics detection
    const descriptionParts = [when, target, effect, restrictions].filter(Boolean)
    const description = descriptionParts.join(' ')

    // Create base stratagem
    const stratagem: Stratagem = {
      id: `stratagem-${name.replace(/\s+/g, '-').toLowerCase()}-${index}`,
      name,
      description,
      cpCost,
      type,
      subtype,
      lore: lore || undefined,
      when,
      target: target || undefined,
      effect,
      restrictions: restrictions || undefined,
      enabled: true // Default to enabled for core stratagems
    }

    // Apply phase heuristics (returns Ability, need to merge back)
    const withPhaseHeuristics = applyHeuristics(stratagem as unknown as Ability)

    // Apply turn owner heuristics
    const turnOwner = detectTurnOwner(when, name)

    // Merge heuristics back into stratagem
    const finalStratagem: Stratagem = {
      ...stratagem,
      autoDetectedPhases: withPhaseHeuristics.autoDetectedPhases,
      autoDetectedTiming: withPhaseHeuristics.autoDetectedTiming ?? 'start',
      oncePerBattle: withPhaseHeuristics.oncePerBattle,
      oncePerBattleRound: withPhaseHeuristics.oncePerBattleRound,
      autoDetectedTurnOwner: turnOwner,
      turnOwner
    }

    stratagems.push(finalStratagem)
  })

  return stratagems
}
