// Decides whether a stratagem's TARGET text can apply to a given unit, by
// matching the keywords named in it against the unit's keywords and names.
//
// The target text is free prose ("One Adeptus Astartes Infantry or Adeptus
// Astartes Mounted unit from your army that ..."), so this is a heuristic.
// It leans inclusive: whenever the text cannot be read confidently the
// stratagem is treated as applicable, because wrongly hiding a usable
// stratagem is worse than showing one that does not apply.

// Words that qualify the target without naming a keyword.
const FILLER_WORDS = new Set([
  'one', 'that', 'friendly', 'unengaged', 'up', 'to', 'two', 'a', 'an', 'the'
])

// BattleScribe faction categories read "Faction: Adeptus Astartes", while
// target text names the faction plainly.
function normalizeTerm(term: string): string {
  return term.toLowerCase().replace(/^faction:\s*/, '').replace(/\s+/g, ' ').trim()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Removes every whole-phrase occurrence of the given terms. Longest terms go
// first so "adeptus astartes" is consumed before a shorter overlapping term.
function removeTerms(text: string, terms: string[]): string {
  let remaining = ` ${text} `
  const sorted = [...terms].sort((a, b) => b.length - a.length)
  for (const term of sorted) {
    if (!term) continue
    const pattern = new RegExp(`(?<=\\s)${escapeRegExp(term)}(?=\\s)`, 'g')
    remaining = remaining.replace(pattern, ' ')
  }
  return remaining.replace(/\s+/g, ' ').trim()
}

function withoutFiller(text: string): string {
  return text.split(' ').filter(word => word && !FILLER_WORDS.has(word)).join(' ')
}

// Comma, slash and "or" separate alternatives ("Dreadnought, Terminator or
// Bladeguard Veteran Squad"); words within one alternative must all match.
function splitAlternatives(clause: string): string[] {
  return clause
    .replace(/\band\/or\b/g, ' or ')
    .split(/,|\/|\sor\s/)
    .map(part => part.replace(/\s+/g, ' ').trim())
}

type AlternativeResult = 'match' | 'mismatch' | 'unsure'

function evaluateAlternative(
  alternative: string, unitTerms: string[], armyTerms: string[]
): AlternativeResult {
  const leftover = withoutFiller(removeTerms(alternative, unitTerms))
  if (!leftover) return 'match'
  // A leftover keyword some other unit in the army has is a requirement this
  // unit definitely fails. Leftover words nobody has could be prose or a
  // weapon keyword (e.g. "Explosives"), so the result is only unsure.
  const unknown = removeTerms(leftover, armyTerms)
  return unknown === leftover ? 'unsure' : 'mismatch'
}

/**
 * @param target    The stratagem's TARGET text; undefined for custom ones.
 * @param unitTerms Keywords and datasheet names of the unit (for an attached
 *                  unit: the union of the bodyguard's and characters').
 * @param armyTerms Keywords and datasheet names of every unit in the army.
 */
export function stratagemTargetsUnit(
  target: string | undefined, unitTerms: string[], armyTerms: string[]
): boolean {
  if (!target) return true
  const text = target.toLowerCase().replace(/\s+/g, ' ')
  const normalizedUnitTerms = unitTerms.map(normalizeTerm)
  const normalizedArmyTerms = armyTerms.map(normalizeTerm)

  // "(excluding Gretchin units)" / "(excluding Aircraft)"
  const excluding = text.match(/\(excluding ([^)]*)\)/)
  if (excluding) {
    const excludedClause = excluding[1].replace(/\bunits?\b/g, ' ')
    const isExcluded = splitAlternatives(excludedClause).some(alternative =>
      alternative && evaluateAlternative(alternative, normalizedUnitTerms, []) === 'match'
    )
    if (isExcluded) return false
  }

  // Keywords sit before the first "unit"/"model"; what follows is conditions
  // ("that has not been selected to shoot") the app cannot check.
  const clauseMatch = text.match(/^(.*?)\b(?:units?|models?)\b/)
  if (!clauseMatch) return true

  const alternatives = splitAlternatives(clauseMatch[1]).filter(Boolean)
  if (alternatives.length === 0) return true
  const results = alternatives.map(alternative =>
    evaluateAlternative(alternative, normalizedUnitTerms, normalizedArmyTerms)
  )
  if (results.includes('match')) return true
  // Only treat the target as unreadable when no alternative was recognized.
  // Once one alternative is recognized, the list was parsed fine and an
  // unknown sibling is just a datasheet this army lacks ("Bladeguard Veteran
  // Squad"), which the unit cannot be.
  return results.every(result => result === 'unsure')
}
