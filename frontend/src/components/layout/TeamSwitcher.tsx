/**
 * Team switcher dropdown component.
 * Implements progressive disclosure - hidden when user has only one team.
 */

import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Users, Check } from 'lucide-react'

export function TeamSwitcher() {
  const { teams, currentTeam, setCurrentTeam, isMultiTeam, isLoading } = useWorkspace()

  // Progressive disclosure: hide if only one team
  if (!isMultiTeam) {
    return null
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Users className="h-4 w-4" />
        Loading...
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{currentTeam?.name ?? 'Select Team'}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onSelect={() => setCurrentTeam(team)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span>{team.name}</span>
              {team.businessUnitName && (
                <span className="text-xs text-muted-foreground">
                  {team.businessUnitName}
                </span>
              )}
            </div>
            {currentTeam?.id === team.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
