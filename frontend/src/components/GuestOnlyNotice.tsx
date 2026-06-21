import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GuestOnlyNotice() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">Sign-up not available</h1>
        <p className="text-muted-foreground">
          Guest mode does not support signing up or signing in. You can use the{' '}
          <Link to="/guest" className="text-primary underline underline-offset-4">
            guest editor
          </Link>{' '}
          to create threat models locally.
        </p>
        <p className="text-muted-foreground">
          To set up Precogly for your organization, check out our{' '}
          <a
            href="https://precogly.github.io/precogly/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            docs
          </a>{' '}
          or review the{' '}
          <a
            href="https://github.com/precogly/precogly"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            source code
          </a>
          . For help setting up, reach out at{' '}
          <a
            href="mailto:vikramsnarayan@gmail.com"
            className="text-primary underline underline-offset-4"
          >
            vikramsnarayan@gmail.com
          </a>
          .
        </p>
        <Link to="/">
          <Button variant="outline" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
