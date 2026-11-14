import { useState, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { X } from 'lucide-react'

const ASPECT_OPTIONS = [
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:3', value: 4 / 3 },
  { label: '2:3', value: 2 / 3 },
  { label: '3:2', value: 3 / 2 },
]

// Same limits the old resize-only upload used, so localStorage usage per photo
// stays about the same (all photos share one localStorage key).
const MAX_OUTPUT_PX = 512
const JPEG_QUALITY = 0.7

function cropToDataUrl(source: string, area: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_OUTPUT_PX / Math.max(area.width, area.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(area.width * scale)
      canvas.height = Math.round(area.height * scale)
      canvas.getContext('2d')!.drawImage(
        img,
        area.x, area.y, area.width, area.height,
        0, 0, canvas.width, canvas.height,
      )
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = reject
    img.src = source
  })
}

interface ImageCropModalProps {
  // Data URL of the picked file, uncropped.
  source: string
  onSave: (dataUrl: string) => void
  onClose: () => void
}

export function ImageCropModal({ source, onSave, onClose }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    try {
      onSave(await cropToDataUrl(source, croppedAreaPixels))
    } catch {
      alert('Failed to process image.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-surface2 rounded-lg shadow-lg max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface2">
          <h3 className="flex-1 text-sm font-semibold text-text">Crop photo</h3>
          <button
            onClick={onClose}
            className="p-1 text-text2 hover:text-accent"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cropper is absolutely positioned and fills its nearest positioned parent. */}
        <div className="relative h-72 bg-black">
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {ASPECT_OPTIONS.map(option => (
              <button
                key={option.label}
                onClick={() => setAspect(option.value)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  aspect === option.value
                    ? 'bg-accent text-background'
                    : 'bg-surface2 text-text2 hover:text-accent'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-xs text-text2">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-sm text-text2 hover:text-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!croppedAreaPixels}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-accent text-background
                disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
