interface StatTileProps {
  label: string
  value: string
  highlight?: boolean
}

export function StatTile({ label, value, highlight }: StatTileProps) {
  const displayValue = (!value || value === '-' || value === '—') ? '—' : value
  return (
    <div className="bg-surface2 rounded-lg p-2 text-center min-w-[3.5rem]">
      <div className="text-text2 text-xs uppercase tracking-wide">{label}</div>
      <div className={`font-bold text-base ${highlight ? 'text-accent' : 'text-text'}`}>{displayValue}</div>
    </div>
  )
}
