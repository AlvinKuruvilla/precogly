import { cn } from '../../lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}

export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label className={cn('inline-flex items-center gap-1.5 cursor-pointer text-sm', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-gray-700">{label}</span>
    </label>
  )
}
