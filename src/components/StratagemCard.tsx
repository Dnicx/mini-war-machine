import { useState } from 'react'
import type { Stratagem, Phase, Timing, TurnOwner } from '../types/roster'
import { effectiveTurnOwner } from '../lib/turnOwnerHeuristics'
import { TIMINGS, TIMING_LABELS } from '../lib/timing'

const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']

interface StratagemCardProps {
  stratagem: Stratagem
  type: 'core' | 'detachment'
  onToggleEnable?: (id: string, enabled: boolean) => void
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onTurnOwnerChange?: (id: string, turnOwner: TurnOwner) => void
  onReset: (id: string) => void
}

export function StratagemCard({ stratagem, type, onToggleEnable, onPhaseToggle, onTimingChange, onTurnOwnerChange, onReset }: StratagemCardProps) {
  const [showLore, setShowLore] = useState(false)
  
  const currentPhases = stratagem.phases || []
  const currentTiming = stratagem.timing || ''
  const currentTurnOwner = effectiveTurnOwner(stratagem)
  const autoPhases = stratagem.autoDetectedPhases || []
  const autoTiming = stratagem.autoDetectedTiming
  const hasUserOverride =
    JSON.stringify(stratagem.phases) !== JSON.stringify(stratagem.autoDetectedPhases) ||
    stratagem.timing !== stratagem.autoDetectedTiming ||
    stratagem.turnOwner !== stratagem.autoDetectedTurnOwner

  // Turn owner color
  const getTurnOwnerColor = (turnOwner: TurnOwner) => {
    switch (turnOwner) {
      case 'yours': return 'bg-blue-500'
      case 'opponent': return 'bg-red-500'
      case 'either': return 'bg-green-500'
    }
  }

  // Stratagem type color (border)
  const borderColor = type === 'core' ? 'border-blue-500' : 'border-purple-500'
  const labelColor = type === 'core' ? 'text-blue-400' : 'text-purple-400'

  return (
    <div className={`bg-surface p-4 rounded-lg border-l-4 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {/* Turn owner indicator */}
        <div className={`w-3 h-3 rounded-full ${getTurnOwnerColor(currentTurnOwner)}`} />
        
        {/* Enable checkbox (core only) */}
        {type === 'core' && onToggleEnable && (
          <input
            type="checkbox"
            checked={stratagem.enabled ?? true}
            onChange={(e) => onToggleEnable(stratagem.id, e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
        )}
        
        {/* Name */}
        <h4 className="font-semibold text-text flex-1">{stratagem.name}</h4>
        
        {/* Phases summary */}
        {currentPhases.length > 0 && (
          <span className="text-xs bg-surface2 text-text2 px-2 py-1 rounded">
            {currentPhases.map(p => p.charAt(0)).join(',')}
          </span>
        )}
        
        {/* Turn owner text */}
        <span className="text-xs text-text2">
          Turn: {currentTurnOwner.charAt(0).toUpperCase() + currentTurnOwner.slice(1)}
        </span>
        
        {/* CP cost */}
        <span className="text-xs bg-surface2 text-text px-2 py-1 rounded font-bold">
          {stratagem.cpCost}
        </span>
      </div>

      {/* Type line */}
      <p className="text-text2 text-xs mb-2">
        {stratagem.type}{stratagem.subtype ? ` – ${stratagem.subtype}` : ''}
      </p>

      {/* Dotted divider */}
      <div className="border-b border-dotted border-surface2/50 mb-3" />

      {/* Lore toggle */}
      {stratagem.lore && (
        <div className="mb-2">
          <label className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLore}
              onChange={(e) => setShowLore(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            Show lore
          </label>
        </div>
      )}

      {/* Lore section */}
      {showLore && stratagem.lore && (
        <>
          <div className="mb-3 p-3 bg-surface2/50 rounded-lg italic text-text2 text-sm">
            {stratagem.lore}
          </div>
          <div className="border-b border-dotted border-surface2/50 mb-3" />
        </>
      )}

      {/* WHEN */}
      <div className="mb-2">
        <span className={`font-semibold ${labelColor} uppercase text-sm`}>WHEN: </span>
        <span className="text-text2 text-sm whitespace-pre-line">{stratagem.when}</span>
      </div>

      {/* TARGET */}
      {stratagem.target && (
        <div className="mb-2">
          <span className={`font-semibold ${labelColor} uppercase text-sm`}>TARGET: </span>
          <span className="text-text2 text-sm whitespace-pre-line">{stratagem.target}</span>
        </div>
      )}

      {/* EFFECT */}
      <div className="mb-2">
        <span className={`font-semibold ${labelColor} uppercase text-sm`}>EFFECT: </span>
        <span className="text-text2 text-sm whitespace-pre-line">{stratagem.effect}</span>
      </div>

      {/* RESTRICTIONS */}
      {stratagem.restrictions && (
        <div className="mb-2">
          <span className={`font-semibold ${labelColor} uppercase text-sm`}>RESTRICTIONS: </span>
          <span className="text-text2 text-sm whitespace-pre-line">{stratagem.restrictions}</span>
        </div>
      )}

      {/* Dotted divider */}
      <div className="border-b border-dotted border-surface2/50 mb-3" />

      {/* Planning UI */}
      <div className="grid grid-cols-2 gap-2">
        {/* Phases */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-text2">Phases</label>
            {hasUserOverride && (
              <button
                onClick={() => onReset(stratagem.id)}
                className="text-xs text-accent hover:text-accent/80"
              >
                auto
              </button>
            )}
          </div>
          <div className="space-y-1">
            {PHASES.map(phase => {
              const isAutoSuggested = autoPhases.includes(phase)
              const isChecked = currentPhases.includes(phase)
              return (
                <label key={phase} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onPhaseToggle(stratagem.id, phase)}
                    className={isAutoSuggested ? 'accent-surface2' : 'accent-accent'}
                  />
                  <span className={isAutoSuggested ? 'text-text2' : ''}>
                    {phase}
                    {isAutoSuggested && <span className="ml-1 text-xs text-text2">(auto)</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Timing and Turn Owner */}
        <div className="space-y-2">
          <div>
            <label className="text-xs text-text2 block mb-1">Timing</label>
            <select
              value={currentTiming || ''}
              onChange={(e) => onTimingChange(stratagem.id, e.target.value as Timing)}
              className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Auto ({autoTiming ? TIMING_LABELS[autoTiming] : 'None'})</option>
              {TIMINGS.map(timing => (
                <option key={timing} value={timing}>{TIMING_LABELS[timing]}</option>
              ))}
            </select>
          </div>

          {onTurnOwnerChange && (
            <div>
              <label className="text-xs text-text2 block mb-1">Turn</label>
              <select
                value={currentTurnOwner}
                onChange={(e) => onTurnOwnerChange(stratagem.id, e.target.value as TurnOwner)}
                className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
              >
                <option value="yours">Yours</option>
                <option value="opponent">Opponent</option>
                <option value="either">Either</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
