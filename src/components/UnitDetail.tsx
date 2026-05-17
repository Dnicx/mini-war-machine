import { useState, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Camera, Swords, Shield, User } from 'lucide-react'
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
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-text hover:text-accent transition-colors"
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
                    <div className="grid grid-cols-3 gap-2 mb-2">
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

function ModelsSubView({ unit, collapsedModels, onToggleModel }: {
  unit: Unit
  collapsedModels: Set<string>
  onToggleModel: (id: string) => void
}) {
  const multiModel = unit.models.length > 1

  return (
    <div className="space-y-4">
      {unit.models.map((model: Model) => (
        <div key={model.id}>
          {multiModel && (
            <button
              onClick={() => onToggleModel(model.id)}
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-text hover:text-accent transition-colors"
            >
              {collapsedModels.has(model.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {model.name}
              <span className="text-text2 text-xs font-normal">×{model.count}</span>
            </button>
          )}
          {!collapsedModels.has(model.id) && (
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="M" value={model.movement} />
              <StatTile label="T" value={model.toughness} />
              <StatTile label="W" value={model.wounds} />
              <StatTile label="SV" value={model.save} />
              <StatTile label="LD" value={model.leadership} />
              <StatTile label="OC" value={model.objectiveControl} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function UnitDetail({ unit, unitImages, onImagesChange, onBack }: UnitDetailProps) {
  const [activeContent, setActiveContent] = useState<'models' | 'weapons' | 'abilities'>('models')
  const [collapsedModels, setCollapsedModels] = useState<Set<string>>(new Set())
  const imageInputRef = useRef<HTMLInputElement>(null)
  const swipeHandlers = useSwipe(() => {}, onBack)

  const toggleModel = (id: string) => {
    setCollapsedModels(prev => {
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
    <div {...swipeHandlers}>
      {/* Sticky floating header */}
      <div className="sticky top-0 z-20 bg-background pt-1 pb-2">
        {/* Row 1: back arrow + image + unit name */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-1 text-text2 hover:text-accent flex-shrink-0 transition-colors"
            aria-label="Back to unit list"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="relative cursor-pointer flex-shrink-0" onClick={handleImageClick}>
            {imageUrl ? (
              <img src={imageUrl} alt={unit.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface2 flex items-center justify-center">
                <User size={20} className="text-text2 opacity-50" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-background/80 rounded-full p-0.5">
              <Camera size={10} className="text-text2" />
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <h2 className="text-lg font-bold text-text flex-1 min-w-0 leading-tight">{unit.name}</h2>
        </div>

        {/* Row 2: nav tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveContent('models')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeContent === 'models' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}
          >
            <User size={14} />
            Models
          </button>
          <button
            onClick={() => setActiveContent('weapons')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeContent === 'weapons' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}
          >
            <Swords size={14} />
            Weapons
          </button>
          <button
            onClick={() => setActiveContent('abilities')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeContent === 'abilities' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}
          >
            <Shield size={14} />
            Abilities
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="pt-3 pb-20">
        {activeContent === 'models' && (
          <ModelsSubView unit={unit} collapsedModels={collapsedModels} onToggleModel={toggleModel} />
        )}
        {activeContent === 'weapons' && (
          <WeaponsSubView unit={unit} collapsedModels={collapsedModels} onToggleModel={toggleModel} />
        )}
        {activeContent === 'abilities' && (
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
    </div>
  )
}
