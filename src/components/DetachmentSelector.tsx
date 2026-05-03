interface DetachmentSelectorProps {
  availableDetachments: string[]
  selectedDetachment: string
  onDetachmentChange: (detachment: string) => void
}

export function DetachmentSelector({ availableDetachments, selectedDetachment, onDetachmentChange }: DetachmentSelectorProps) {
  if (availableDetachments.length === 0) return null

  return (
    <div className="mb-6 bg-surface p-4 rounded-lg border-l-4 border-surface2">
      <h2 className="text-lg font-semibold text-text mb-3">Detachment</h2>
      <select
        value={selectedDetachment}
        onChange={(e) => onDetachmentChange(e.target.value)}
        className="w-full px-4 py-2 bg-surface2 border border-surface2 rounded text-text focus:outline-none focus:border-accent"
      >
        <option value="">Select detachment...</option>
        {availableDetachments.map(det => (
          <option key={det} value={det}>
            {det.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </option>
        ))}
      </select>
    </div>
  )
}
