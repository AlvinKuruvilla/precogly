/**
 * Auth API hooks for password reset and other auth operations.
 */

import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

const API_BASE = '/api'

/**
 * Request a password reset email.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`${API_BASE}/auth/password/reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new ApiError('Failed to send reset email', response.status, error)
      }

      return response.json()
    },
  })
}

interface ConfirmPasswordResetInput {
  uid: string
  token: string
  newPassword1: string
  newPassword2: string
}

/**
 * Confirm password reset with the token from email.
 */
export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async ({ uid, token, newPassword1, newPassword2 }: ConfirmPasswordResetInput) => {
      const response = await fetch(`${API_BASE}/auth/password/reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          token,
          new_password1: newPassword1,
          new_password2: newPassword2,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new ApiError('Failed to reset password', response.status, error)
      }

      return response.json()
    },
  })
}
