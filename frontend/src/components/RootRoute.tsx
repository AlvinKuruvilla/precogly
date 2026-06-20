import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { GuestDFDEditor } from '@/features/guest-editor'

export function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <GuestDFDEditor />
  }

  return <Layout />
}
