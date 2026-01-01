import { type ClassValue, clsx } from 'clsx'

// Simple cn utility (without tailwind-merge for now)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
