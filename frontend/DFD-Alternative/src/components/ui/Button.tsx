import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
          'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300': variant === 'secondary',
          'text-gray-600 hover:text-gray-900 hover:bg-gray-100': variant === 'ghost',
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-sm': size === 'md',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
