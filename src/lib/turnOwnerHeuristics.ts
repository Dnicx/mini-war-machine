import type { TurnOwner } from '../types/roster'

const OPPONENT_PATTERNS = [
  /your opponent('s)?/i,
  /opponent('s)? (movement|shooting|charge|fight|command)/i,
  /during the opponent('s)?/i,
  // Ability-description reactive cues — these implicitly happen in the opponent's turn
  /when targeted/i,
  /when hit/i,
  /when charged/i,
  /intercept/i,
  /counter/i
]

const YOURS_PATTERNS = [
  /your (movement|shooting|charge|fight|command) phase/i,
  /start of your turn/i,
  /during your/i,
  /in your (movement|shooting|charge|fight|command) phase/i
]

const EITHER_PATTERNS = [
  /in any phase/i,
  /at the start of any phase/i,
  /at the end of any phase/i,
  /start of (the )?battle round/i
]

export function detectTurnOwner(when: string, name: string): TurnOwner {
  // Special case: COMMAND RE-ROLL is always either
  if (name === 'COMMAND RE-ROLL') {
    return 'either'
  }

  // Check for opponent turn
  if (OPPONENT_PATTERNS.some(pattern => pattern.test(when))) {
    return 'opponent'
  }

  // Check for your turn
  if (YOURS_PATTERNS.some(pattern => pattern.test(when))) {
    return 'yours'
  }

  // Check for either patterns
  if (EITHER_PATTERNS.some(pattern => pattern.test(when))) {
    return 'either'
  }

  // Default to yours if no pattern matches
  return 'either'
}
