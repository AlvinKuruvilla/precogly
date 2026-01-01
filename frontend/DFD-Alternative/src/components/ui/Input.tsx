import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'inline-flex h-8 px-2 py-1 rounded-md border border-gray-300 bg-white text-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'placeholder:text-gray-400',
        className
      )}
      {...props}
    />
  )
}
