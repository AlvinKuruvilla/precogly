import { useState } from 'react'
import { User, Check, ChevronsUpDown, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useTeamMembers, useOrganizationMembers } from '@/features/organization/api/organizations'
import type { TeamMembership, OrganizationMembership } from '@/features/organization/types/organization'
import { SectionHeader } from './SectionHeader'
import type { Assignee } from './ComponentView'

export function UserSearchCombobox({
  value,
  onSelect,
  onCancel,
}: {
  value: string
  onSelect: (assignee: Assignee) => void
  onCancel: () => void
}) {
  const [open, setOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [teamMembersOpen, setTeamMembersOpen] = useState(true)
  const [orgMembersOpen, setOrgMembersOpen] = useState(false)

  // Get current workspace context
  const { currentTeam, currentOrganization } = useWorkspace()

  // Fetch real data
  const { data: teamMembers = [], isLoading: teamMembersLoading } = useTeamMembers(
    currentTeam?.id ?? 0
  )
  const { data: orgMembers = [], isLoading: orgMembersLoading } = useOrganizationMembers(
    currentOrganization?.id ?? 0
  )

  // Filter org members to exclude those already in the current team
  const teamMemberEmails = new Set(teamMembers.map((m) => m.userEmail))
  const otherOrgMembers = orgMembers.filter((m) => !teamMemberEmails.has(m.userEmail))

  // Find selected display value
  const selectedTeamMember = teamMembers.find((m) => m.userEmail === value)
  const selectedOrgMember = orgMembers.find((m) => m.userEmail === value)
  const selectedName = selectedTeamMember?.userName ?? selectedOrgMember?.userEmail ?? value

  // Filter functions
  const filterTeamMember = (member: TeamMembership) => {
    const searchLower = search.toLowerCase()
    return (
      member.userName.toLowerCase().includes(searchLower) ||
      member.userEmail.toLowerCase().includes(searchLower)
    )
  }

  const filterOrgMember = (member: OrganizationMembership) => {
    const searchLower = search.toLowerCase()
    return member.userEmail.toLowerCase().includes(searchLower)
  }

  const filteredTeamMembers = teamMembers.filter(filterTeamMember)
  const filteredOrgMembers = otherOrgMembers.filter(filterOrgMember)

  const isLoading = teamMembersLoading || orgMembersLoading
  const hasNoResults =
    !isLoading &&
    filteredTeamMembers.length === 0 &&
    filteredOrgMembers.length === 0

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between h-9 text-sm font-normal"
          >
            {value ? (
              <span className="truncate">{selectedName}</span>
            ) : (
              <span className="text-muted-foreground">Select team member...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              )}
              {hasNoResults && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {/* Team Members Section */}
              {filteredTeamMembers.length > 0 && (
                <div>
                  <SectionHeader
                    icon={User}
                    label="Team Members"
                    count={filteredTeamMembers.length}
                    isOpen={teamMembersOpen}
                    onClick={() => setTeamMembersOpen(!teamMembersOpen)}
                  />
                  {teamMembersOpen && (
                    <CommandGroup>
                      {filteredTeamMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={`member-${member.userEmail}`}
                          onSelect={() => {
                            onSelect({ type: 'member', userId: member.user, email: member.userEmail, name: member.userName })
                            setOpen(false)
                          }}
                          className="flex items-center gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              value === member.userEmail ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {member.userName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.userEmail}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>
              )}

              {/* Org Members Section */}
              {filteredOrgMembers.length > 0 && (
                <div>
                  <SectionHeader
                    icon={Building2}
                    label="Org Members"
                    count={filteredOrgMembers.length}
                    isOpen={orgMembersOpen}
                    onClick={() => setOrgMembersOpen(!orgMembersOpen)}
                    hasBorderTop
                  />
                  {orgMembersOpen && (
                    <CommandGroup>
                      {filteredOrgMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={`org-${member.userEmail}`}
                          onSelect={() => {
                            onSelect({ type: 'member', userId: member.user, email: member.userEmail, name: null })
                            setOpen(false)
                          }}
                          className="flex items-center gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              value === member.userEmail ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {member.userEmail}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 flex-1"
          disabled={!value}
          onClick={() => {
            if (selectedTeamMember) {
              onSelect({ type: 'member', userId: selectedTeamMember.user, email: selectedTeamMember.userEmail, name: selectedTeamMember.userName })
            } else if (selectedOrgMember) {
              onSelect({ type: 'member', userId: selectedOrgMember.user, email: selectedOrgMember.userEmail, name: null })
            }
          }}
        >
          Assign
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
