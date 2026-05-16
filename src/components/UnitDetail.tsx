import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp, Camera, Swords, Shield, User } from 'lucide-react'
import type { Unit, Model } from '../types/roster'
import { useSwipe } from '../hooks/useSwipe'
import { StatTile } from './StatTile'
import { PlayAbilityCard } from './PlayAbilityCard'

interface UnitDetailProps {
  unit: Unit
  unitImages: Record<string, string>
  onImagesChange: (images: Record<string, string>) => void
  onBack: () => void
}

function resizeImage(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ModelStatBlock({
  model,
  isCollapsed,
  onToggle,
  showHeader,
}: {
  model: Model
  isCollapsed: boolean
  onToggle: () => void
  showHeader: boolean
}) {
  return (
    <div className="mb-3">
      {showHeader && (
        <button
          onClick={onToggle}
          className="flex items-center gap-2 mb-2 text-sm font-semibold text-text hover:text-accent transition-colors"
        >
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {model.name}
          <span className="text-text2 text-xs font-normal">×{model.count}</span>
        </button>
      )}
      {!isCollapsed && (
        <div className="flex flex-wrap gap-2">
          <StatTile label="M" value={model.movement} />
          <StatTile label="T" value={model.toughness} />
          <StatTile label="W" value={model.wounds} />
          <StatTile label="SV" value={model.save} />
          <StatTile label="InvSv" value={model.invulnerableSave} />
          <StatTile label="LD" value={model.leadership} />
          <StatTile label="OC" value={model.objectiveControl} />
        </div>
      )}
    </div>
  )
}

function WeaponsSubView({ unit, collapsedModels, onToggleModel }: {
  unit: Unit
  collapsedModels: Set<string>
  onToggleModel: (id: string) => void
}) {
  const multiModel = unit.models.length > 1

  return (
    <div className="space-y-4">
      {unit.models.map(model => (
        <div key={model.id}>
          {multiModel && (
            <button
              onClick={() => onToggleModel(model.id)}
              className="flex items-center gap-2 mb-2 text-sm font-semibold text-text hover:text-accent transition-colors"
            >
              {collapsedModels.has(model.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {model.name}
              <span className="text-text2 text-xs font-normal">×{model.count}</span>
            </button>
          )}
          {!collapsedModels.has(model.id) && (
            <div className="space-y-3">
              {model.weapons.length === 0 ? (
                <p className="text-text2 text-sm italic">No weapons</p>
              ) : (
                model.weapons.map((weapon, i) => (
                  <div key={i} className="bg-surface rounded-lg p-3">
                    <p className="text-text text-sm font-semibold mb-2">{weapon.name}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <StatTile label="Range" value={weapon.range} />
                      <StatTile label="A" value={weapon.attacks} />
                      <StatTile label="BS/WS" value={weapon.bs} />
                      <StatTile label="S" value={weapon.s} />
                      <StatTile label="AP" value={weapon.ap} />
                      <StatTile label="D" value={weapon.damage} />
                    </div>
                    {weapon.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {weapon.keywords.map(kw => (
                          <span key={kw} className="text-xs bg-surface2 text-text2 px-2 py-0.5 rounded-full">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function UnitDetail({ unit, unitImages, onImagesChange, onBack }: UnitDetailProps) {
  const [activeContent, setActiveContent] = useState<'weapons' | 'abilities'>('weapons')
  const [collapsedModels, setCollapsedModels] = useState<Set<string>>(new Set())
  const [collapsedStatModels, setCollapsedStatModels] = useState<Set<string>>(new Set())
  const imageInputRef = useRef<HTMLInputElement>(null)
  const swipeHandlers = useSwipe(() => {}, onBack)

  const multiModel = unit.models.length > 1

  const toggleModel = (id: string) => {
    setCollapsedModels(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleStatModel = (id: string) => {
    setCollapsedStatModels(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImageClick = () => imageInputRef.current?.click()

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImage(file, 512, 0.7)
      onImagesChange({ ...unitImages, [unit.id]: dataUrl })
    } catch {
      alert('Failed to process image.')
    }
    e.target.value = ''
  }

  const imageUrl = unitImages[unit.id]

  return (
    <div className="flex flex-col h-full" {...swipeHandlers}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-surface rounded-xl mb-4">
        <div className="relative flex-shrink-0 cursor-pointer" onClick={handleImageClick}>
          {imageUrl ? (
            <img src={imageUrl} alt={unit.name} className="w-20 h-20 rounded-lg object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-surface2 flex items-center justify-center">
              <User size={32} className="text-text2" />
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-surface/80 rounded-full p-0.5">
            <Camera size={12} className="text-text2" />
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-text leading-tight">{unit.name}</h2>
          {unit.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {unit.keywords.map(kw => (
                <span key={kw.id} className="text-xs bg-surface2 text-text2 px-1.5 py-0.5 rounded">{kw.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat block */}
      <div className="mb-4">
        {unit.models.map(model => (
          <ModelStatBlock
            key={model.id}
            model={model}
            showHeader={multiModel}
            isCollapsed={collapsedStatModels.has(model.id)}
            onToggle={() => toggleStatModel(model.id)}
          />
        ))}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-24 min-h-0">
        {activeContent === 'weapons' ? (
          <WeaponsSubView unit={unit} collapsedModels={collapsedModels} onToggleModel={toggleModel} />
        ) : (
          <div className="space-y-2">
            {unit.abilities.length === 0 ? (
              <p className="text-text2 text-sm text-center py-8">No abilities defined for this unit</p>
            ) : (
              unit.abilities.map(ability => (
                <PlayAbilityCard key={ability.id} ability={ability} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom switcher — pinned above tab bar */}
      <div className="flex gap-2 p-2 border-t border-surface2 bg-background mb-16">
        <button
          onClick={() => setActiveContent('weapons')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            activeContent === 'weapons' ? 'bg-accent text-white' : 'bg-surface2 text-text'
          }`}
        >
          <Swords size={16} />
          Weapons
        </button>
        <button
          onClick={() => setActiveContent('abilities')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            activeContent === 'abilities' ? 'bg-accent text-white' : 'bg-surface2 text-text'
          }`}
        >
          <Shield size={16} />
          Abilities
        </button>
      </div>
    </div>
  )
}
