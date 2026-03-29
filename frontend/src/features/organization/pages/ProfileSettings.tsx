/**
 * User profile settings page.
 */

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useChangePassword } from '@/api/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Check, AlertCircle } from 'lucide-react'

export function ProfileSettings() {
  const { user } = useAuth()
  const changePasswordMutation = useChangePassword()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword1, setNewPassword1] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess(false)

    changePasswordMutation.mutate(
      { oldPassword, newPassword1, newPassword2 },
      {
        onSuccess: () => {
          setOldPassword('')
          setNewPassword1('')
          setNewPassword2('')
          setPasswordSuccess(true)
        },
      }
    )
  }

  const passwordErrors = changePasswordMutation.error
    ? (changePasswordMutation.error as { data?: Record<string, string[]> }).data
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your personal account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="old-password">Current Password</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              {passwordErrors?.old_password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {passwordErrors.old_password[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password1">New Password</Label>
              <Input
                id="new-password1"
                type="password"
                value={newPassword1}
                onChange={(e) => setNewPassword1(e.target.value)}
                required
              />
              {passwordErrors?.new_password1 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {passwordErrors.new_password1[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password2">Confirm New Password</Label>
              <Input
                id="new-password2"
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                required
              />
              {passwordErrors?.new_password2 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {passwordErrors.new_password2[0]}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending || !oldPassword || !newPassword1 || !newPassword2}
              >
                {changePasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Change Password
              </Button>
              {passwordSuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Password changed successfully
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
